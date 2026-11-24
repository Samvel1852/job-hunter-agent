export type DigestJob = {
  id?: string;
  title: string;
  company: string;
  location?: string;
  source?: string;
  score?: string;
};

export type DeliveredJob = {
  date?: string;
  jobId?: string;
  fingerprint?: string;
};

export type PriorDigest = {
  title?: string;
  body?: string;
};

const DIGEST_TITLE = /^(\d+) new matches for (\d{4}-\d{2}-\d{2})$/;

function clean(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(inc|incorporated|llc|ltd|limited|gmbh|group|holding|holdings|armenia|senior|sr|junior|jr|lead)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Same employer and role, ignoring seniority words and punctuation. */
export function roleKey(company: string, title: string): string {
  return `${clean(company)}|${clean(title)}`;
}

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function renderIssueTable(jobs: DigestJob[]): string {
  const lines = [
    '| # | Fit | Role | Company | Location | Source |',
    '| - | --- | ---- | ------- | -------- | ------ |',
  ];
  jobs.forEach((job, index) => {
    const score = String(job.score ?? '').replace(/%$/, '') || '0';
    lines.push(
      `| ${index + 1} | ${score}% | ${cell(job.title)} | ${cell(job.company)} | ${cell(job.location ?? '')} | ${cell(job.source ?? '')} |`,
    );
  });
  return lines.join('\n');
}

function splitRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '\\' && line[index + 1] === '|') {
      current += '|';
      index += 1;
      continue;
    }
    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim() !== '') cells.push(current.trim());
  return cells;
}

/** Roles previously listed in a digest issue body. */
export function parseEmailedJobs(body: string): DigestJob[] {
  const jobs: DigestJob[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = splitRow(trimmed);
    const fields = cells.filter((value, index) => value !== '' || (index !== 0 && index !== cells.length - 1));
    if (!/^\d+$/.test(fields[0] ?? '')) continue;
    const title = fields[2] ?? '';
    const company = fields[3] ?? '';
    if (title === '' || company === '') continue;
    jobs.push({
      title,
      company,
      score: (fields[1] ?? '').replace(/%$/, ''),
      location: fields[4] ?? '',
      source: fields[5] ?? '',
    });
  }
  return jobs;
}

function fingerprintRole(fingerprint: string): string {
  const pipe = fingerprint.indexOf('|');
  const company = pipe === -1 ? fingerprint : fingerprint.slice(0, pipe);
  const title = pipe === -1 ? '' : fingerprint.slice(pipe + 1);
  return roleKey(company, title);
}

function blockedByEarlierDelivery(job: DigestJob, role: string, delivered: DeliveredJob[], date: string): boolean {
  return delivered.some((record) => {
    if (record.date !== undefined && record.date >= date) return false;
    if (job.id !== undefined && job.id !== '' && record.jobId === job.id) return true;
    return record.fingerprint !== undefined && record.fingerprint !== '' && fingerprintRole(record.fingerprint) === role;
  });
}

/**
 * Jobs from this review page that still need an email.
 * A role already listed in any digest issue, or saved in the delivered ledger
 * before this date, is left out. A second pass for the same date therefore
 * sends nothing unless the page has a role that was neither emailed nor
 * delivered earlier. Today's ledger entries do not count as already emailed:
 * those packs are saved before the first send.
 */
export function selectJobsToEmail(input: {
  jobs: DigestJob[];
  date: string;
  delivered?: DeliveredJob[];
  priorIssues?: PriorDigest[];
}): DigestJob[] {
  const delivered = input.delivered ?? [];
  const emailed = new Set<string>();
  let sameDateOpaque = false;
  for (const issue of input.priorIssues ?? []) {
    const when = DIGEST_TITLE.exec(issue.title ?? '')?.[2];
    if (when === undefined) continue;
    const parsed = parseEmailedJobs(issue.body ?? '');
    if (parsed.length === 0) {
      if (when === input.date) sameDateOpaque = true;
      continue;
    }
    for (const job of parsed) emailed.add(roleKey(job.company, job.title));
  }

  const selected: DigestJob[] = [];
  const seenIds = new Set<string>();
  const seenRoles = new Set<string>();
  for (const job of input.jobs) {
    if (job.title.trim() === '') continue;
    const role = roleKey(job.company, job.title);
    if ((job.id !== undefined && job.id !== '' && seenIds.has(job.id)) || seenRoles.has(role)) continue;
    if (job.id !== undefined && job.id !== '') seenIds.add(job.id);
    seenRoles.add(role);
    if (emailed.has(role)) continue;
    if (blockedByEarlierDelivery(job, role, delivered, input.date)) continue;
    selected.push(job);
  }
  if (sameDateOpaque) return [];
  return selected;
}
