import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mergeDigestJobs,
  parseEmailedJobs,
  planDailyEmail,
  renderDigestIssueBody,
  roleKey,
} from '../bot/lib/emailDigest.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reviewDir = join(root, 'review');
const MENTION = '@Samvel1852';

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function githubRepo() {
  const remote = git(['remote', 'get-url', 'origin']).replace(/\/\/[^@/]+@/, '//');
  const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match) throw new Error('Origin is not a GitHub repository.');
  const gitRoot = git(['rev-parse', '--show-toplevel']);
  // Review pages are published on main. An automation checkout is often an
  // unpublished branch, and a slash in that name makes a raw URL 404. htmlpreview
  // then shows a blank page.
  const reviewPrefix = relative(gitRoot, reviewDir).split('\\').join('/');
  return { owner: match[1], repo: match[2], branch: 'main', reviewPrefix };
}

function decode(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseDigest(html) {
  const date = /<h1>.*?·\s*(\d{4}-\d{2}-\d{2})<\/h1>/.exec(html)?.[1];
  const seenIds = new Set();
  const seenRoles = new Set();
  const jobs = [];
  for (const block of html.split('<article').slice(1)) {
    const id = /data-job="([^"]+)"/.exec(block)?.[1] ?? '';
    const title = decode(/<h2>(.*?)<\/h2>/.exec(block)?.[1] ?? '');
    const meta = decode(/<div class="meta">(.*?)<\/div>/.exec(block)?.[1] ?? '');
    const [company, location] = meta.split(' · ').map((part) => part.trim());
    const source = /<span class="badge">(.*?)<\/span>/.exec(block)?.[1] ?? '';
    const score = /<div class="score">(\d+)%/.exec(block)?.[1] ?? '';
    if (!title) continue;
    const role = roleKey(company ?? '', title);
    if ((id && seenIds.has(id)) || seenRoles.has(role)) continue;
    if (id) seenIds.add(id);
    seenRoles.add(role);
    jobs.push({ id, title, company: company ?? '', location: location ?? '', source, score });
  }
  return { date, jobs };
}

function redact(text) {
  return text.replace(/crsr_[a-z0-9]+/gi, '[redacted]').replace(/ghs_[A-Za-z0-9_]+/g, '[redacted]');
}

async function github(token, method, path, body) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'job-hunter-digest',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text === '' ? {} : JSON.parse(text);
  } catch {
    parsed = { message: text };
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

async function latestReview() {
  const names = (await readdir(reviewDir))
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.html$/.test(name))
    .sort();
  if (names.length === 0) throw new Error('No review page to email.');
  const name = names[names.length - 1];
  const html = await readFile(join(reviewDir, name), 'utf8');
  const parsed = parseDigest(html);
  parsed.date ??= name.slice(0, 10);
  return parsed;
}

async function sourceErrors(date) {
  try {
    const meta = JSON.parse(await readFile(join(reviewDir, `${date}.meta.json`), 'utf8'));
    return Array.isArray(meta.sourceErrors) ? meta.sourceErrors.map(String) : [];
  } catch {
    return [];
  }
}

async function readDelivered() {
  try {
    const parsed = JSON.parse(await readFile(join(root, 'state/delivered.json'), 'utf8'));
    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch {
    return [];
  }
}

const { date, jobs: pageJobs } = await latestReview();
if (pageJobs.length === 0) {
  console.error(`Review page for ${date} has no roles, so nothing was emailed.`);
  process.exit(1);
}

const delivered = await readDelivered();
const errors = await sourceErrors(date);
if (process.argv.includes('--dry-run')) {
  const preview = planDailyEmail({ jobs: pageJobs, date, delivered, priorIssues: [] });
  const count = preview.action === 'send' ? preview.jobs.length : 0;
  console.log(`${count} new matches for ${date}\n${count} roles\n${errors.join('; ')}`);
  process.exit(0);
}

const key = process.env.CURSOR_API_KEY;
if (!key) {
  console.error('CURSOR_API_KEY is not set, so the digest was not emailed.');
  process.exit(1);
}
const { owner: OWNER, repo: REPO, branch: BRANCH, reviewPrefix } = githubRepo();
const reviewUrl = `https://htmlpreview.github.io/?https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${reviewPrefix}/${date}.html`;

const tokenResponse = await fetch('https://api.cursor.com/v0/scm-events/github-token', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
  body: JSON.stringify({ repos: [`${OWNER}/${REPO}`], permissions: 'pr-write' }),
});
const tokenText = await tokenResponse.text();
if (!tokenResponse.ok) {
  console.error(`GitHub credential request failed (${tokenResponse.status}): ${redact(tokenText).slice(0, 300)}`);
  process.exit(1);
}
const token = JSON.parse(tokenText).token;
if (typeof token !== 'string' || token === '') {
  console.error('GitHub credential request returned no token.');
  process.exit(1);
}

async function listDigestIssues() {
  const issues = [];
  for (let page = 1; page <= 20; page += 1) {
    const response = await github(
      token,
      'GET',
      `/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${page}`,
    );
    if (!response.ok || !Array.isArray(response.body)) {
      return { ok: false, status: response.status, issues: [] };
    }
    for (const issue of response.body) {
      if (issue.pull_request) continue;
      issues.push({
        title: typeof issue.title === 'string' ? issue.title : '',
        body: typeof issue.body === 'string' ? issue.body : '',
        html_url: issue.html_url,
        number: issue.number,
      });
    }
    if (response.body.length < 100) break;
  }
  return { ok: true, issues };
}

function sameDayIssue(issues) {
  return issues
    .filter((issue) => /^\d+ new matches for \d{4}-\d{2}-\d{2}$/.test(issue.title) && issue.title.endsWith(date))
    .sort((left, right) => left.number - right.number)[0];
}

async function finishAlreadySent(issues, additions) {
  const existing = sameDayIssue(issues);
  let updated = false;
  // Editing the issue body does not mention anyone new and does not open a
  // second issue, so it does not send another email. A comment would.
  if (existing?.number && existing.body?.includes(MENTION) && additions.length > 0) {
    const jobs = mergeDigestJobs(parseEmailedJobs(existing.body), additions);
    const reviewMatch = /Review page: (\S+)/.exec(existing.body);
    const patched = await github(token, 'PATCH', `/repos/${OWNER}/${REPO}/issues/${existing.number}`, {
      title: `${jobs.length} new matches for ${date}`,
      body: renderDigestIssueBody({
        date,
        reviewUrl: reviewMatch?.[1] ?? reviewUrl,
        jobs,
        errors,
        mention: MENTION,
      }),
    });
    updated = patched.ok;
    if (!patched.ok) {
      console.error(
        `Could not record new roles on the existing digest (${patched.status}), so no second email was sent.`,
      );
    }
  }
  console.log(
    JSON.stringify({
      delivered: false,
      reason: 'already-sent',
      date,
      updated,
      ...(existing?.html_url ? { url: existing.html_url } : {}),
    }),
  );
  process.exit(0);
}

async function listedPlan() {
  const listed = await listDigestIssues();
  if (!listed.ok) return listed;
  return {
    ok: true,
    issues: listed.issues,
    plan: planDailyEmail({ jobs: pageJobs, date, delivered, priorIssues: listed.issues }),
  };
}

const firstPass = await listedPlan();
if (!firstPass.ok) {
  console.error(`Could not check previously emailed digests (${firstPass.status}), so nothing was emailed.`);
  process.exit(1);
}
if (firstPass.plan.action === 'skip') await finishAlreadySent(firstPass.issues, firstPass.plan.additions);

const secondPass = await listedPlan();
if (!secondPass.ok) {
  console.error(`Could not check previously emailed digests (${secondPass.status}), so nothing was emailed.`);
  process.exit(1);
}
if (secondPass.plan.action === 'skip') await finishAlreadySent(secondPass.issues, secondPass.plan.additions);

const jobs = secondPass.plan.jobs;
const title = `${jobs.length} new matches for ${date}`;
const body = renderDigestIssueBody({ date, reviewUrl, jobs, errors, mention: MENTION });
const created = await github(token, 'POST', `/repos/${OWNER}/${REPO}/issues`, { title, body });
if (!created.ok) {
  console.error(
    `Could not open the digest issue (${created.status}): ${redact(JSON.stringify(created.body)).slice(0, 400)}`,
  );
  process.exit(1);
}
console.log(
  JSON.stringify({
    delivered: true,
    url: created.body.html_url,
    author: created.body.user?.login ?? null,
    number: created.body.number,
  }),
);
