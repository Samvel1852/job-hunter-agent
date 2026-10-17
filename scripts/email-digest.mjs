import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const jobs = html
    .split('<article')
    .slice(1)
    .map((block) => {
      const title = decode(/<h2>(.*?)<\/h2>/.exec(block)?.[1] ?? '');
      const meta = decode(/<div class="meta">(.*?)<\/div>/.exec(block)?.[1] ?? '');
      const [company, location] = meta.split(' · ').map((part) => part.trim());
      const source = /<span class="badge">(.*?)<\/span>/.exec(block)?.[1] ?? '';
      const score = /<div class="score">(\d+)%/.exec(block)?.[1] ?? '';
      return { title, company: company ?? '', location: location ?? '', source, score };
    })
    .filter((job) => job.title !== '');
  return { date, jobs };
}

function cell(value) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function table(jobs) {
  const lines = [
    '| # | Fit | Role | Company | Location | Source |',
    '| - | --- | ---- | ------- | -------- | ------ |',
  ];
  jobs.forEach((job, index) => {
    lines.push(
      `| ${index + 1} | ${job.score}% | ${cell(job.title)} | ${cell(job.company)} | ${cell(job.location)} | ${cell(job.source)} |`,
    );
  });
  return lines.join('\n');
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

const { date, jobs } = await latestReview();
if (jobs.length === 0) {
  console.error(`Review page for ${date} has no roles, so nothing was emailed.`);
  process.exit(1);
}

const errors = await sourceErrors(date);
if (process.argv.includes('--dry-run')) {
  console.log(`${titlePlaceholder(jobs, date)}\n${jobs.length} roles\n${errors.join('; ')}`);
  process.exit(0);
}

function titlePlaceholder(parsedJobs, parsedDate) {
  return `${parsedJobs.length} new matches for ${parsedDate}`;
}

const key = process.env.CURSOR_API_KEY;
if (!key) {
  console.error('CURSOR_API_KEY is not set, so the digest was not emailed.');
  process.exit(1);
}
const { owner: OWNER, repo: REPO, branch: BRANCH, reviewPrefix } = githubRepo();
const reviewUrl = `https://htmlpreview.github.io/?https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${reviewPrefix}/${date}.html`;
const title = `${jobs.length} new matches for ${date}`;
const body = [
  `**${title}**`,
  '',
  `Review page: ${reviewUrl}`,
  '',
  table(jobs),
  '',
  errors.length > 0 ? `Sources with errors: ${errors.join('; ')}` : '',
  '',
  MENTION,
]
  .filter((line, index, all) => line !== '' || all[index - 1] !== '')
  .join('\n');

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

const existing = await github(
  token,
  'GET',
  `/repos/${OWNER}/${REPO}/issues?state=all&per_page=50&creator=app/cursor`,
);
const already = Array.isArray(existing.body)
  ? existing.body.find((issue) => issue.title === title)
  : undefined;
if (already?.html_url && !process.argv.includes('--remind')) {
  console.log(
    JSON.stringify({
      delivered: false,
      reason: 'already-sent',
      url: already.html_url,
      author: already.user?.login ?? null,
    }),
  );
  process.exit(0);
}

if (already?.html_url && process.argv.includes('--remind')) {
  const comment = await github(token, 'POST', `/repos/${OWNER}/${REPO}/issues/${already.number}/comments`, {
    body,
  });
  if (!comment.ok) {
    console.error(
      `Could not remind with the digest (${comment.status}): ${redact(JSON.stringify(comment.body)).slice(0, 400)}`,
    );
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      delivered: true,
      reason: 'reminded',
      url: comment.body.html_url,
      author: comment.body.user?.login ?? null,
    }),
  );
  process.exit(0);
}

const created = await github(token, 'POST', `/repos/${OWNER}/${REPO}/issues`, { title, body });
if (created.ok) {
  console.log(
    JSON.stringify({
      delivered: true,
      url: created.body.html_url,
      author: created.body.user?.login ?? null,
      number: created.body.number,
    }),
  );
  process.exit(0);
}

const pulls = await github(
  token,
  'GET',
  `/repos/${OWNER}/${REPO}/pulls?head=${OWNER}:${BRANCH}&state=open`,
);
const pull = Array.isArray(pulls.body) ? pulls.body[0] : undefined;
if (!pull?.number) {
  console.error(
    `Could not open the digest issue (${created.status}): ${redact(JSON.stringify(created.body)).slice(0, 400)}`,
  );
  process.exit(1);
}
const comment = await github(token, 'POST', `/repos/${OWNER}/${REPO}/issues/${pull.number}/comments`, {
  body,
});
if (!comment.ok) {
  console.error(
    `Could not comment with the digest (${comment.status}): ${redact(JSON.stringify(comment.body)).slice(0, 400)}`,
  );
  process.exit(1);
}
console.log(
  JSON.stringify({
    delivered: true,
    url: comment.body.html_url,
    author: comment.body.user?.login ?? null,
  }),
);
