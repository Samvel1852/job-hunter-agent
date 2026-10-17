import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HostKvApi } from '@cursor/bdk';
import { CANDIDATE } from './config.js';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

export type ApplicationPack = {
  date: string;
  savedAt: string;
  job: {
    id: string;
    source: string;
    title: string;
    company: string;
    location: string;
    region: string;
    url: string;
    applyUrl?: string;
    employerEmail?: string;
  };
  fitScore: number;
  fitReasons: string[];
  gaps: string[];
  headline: string;
  summary: string;
  cvMarkdown: string;
  coverLetter: string;
  canvaUrl?: string;
};

export type SeenRecord = { date: string; jobId: string; fingerprint?: string };

export const deliveredFile = join(projectRoot, 'state/delivered.json');
export const reviewDir = join(projectRoot, 'review');

export type BaseCv = { markdown: string; source: string; updatedAt: string };

export const keys = {
  baseCv: 'cv:base',
  seenJob: (jobId: string) => `seen:job:${jobId}`,
  seenFingerprint: (fp: string) => `seen:fp:${fp}`,
  day: (date: string) => `day:${date}`,
  pack: (jobId: string) => `pack:${jobId}`,
};

export function today(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CANDIDATE.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

type DeliveredFile = { jobs?: SeenRecord[] };

export async function readDelivered(file = deliveredFile): Promise<SeenRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8')) as DeliveredFile;
    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch {
    return [];
  }
}

export async function rememberDelivered(record: SeenRecord, file = deliveredFile): Promise<void> {
  const jobs = await readDelivered(file);
  if (jobs.some((job) => job.jobId === record.jobId)) return;
  jobs.push(record);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ jobs }, null, 2)}\n`);
}

export async function wasDelivered(
  kv: HostKvApi,
  jobId: string,
  fp: string,
  file = deliveredFile,
): Promise<SeenRecord | undefined> {
  const byId = (await kv.get(keys.seenJob(jobId))) as SeenRecord | undefined;
  if (byId) return byId;
  const byFp = (await kv.get(keys.seenFingerprint(fp))) as SeenRecord | undefined;
  if (byFp) return byFp;
  const jobs = await readDelivered(file);
  return jobs.find((job) => job.jobId === jobId || (job.fingerprint !== undefined && job.fingerprint === fp));
}

export async function dayJobIds(kv: HostKvApi, date: string, file = deliveredFile): Promise<string[]> {
  const fromKv = ((await kv.get(keys.day(date))) as string[] | undefined) ?? [];
  const fromFile = (await readDelivered(file)).filter((job) => job.date === date).map((job) => job.jobId);
  return [...new Set([...fromKv, ...fromFile])];
}

export async function writeReviewPage(date: string, html: string): Promise<string> {
  const path = join(reviewDir, `${date}.html`);
  await mkdir(reviewDir, { recursive: true });
  await writeFile(path, html);
  return path;
}

export async function loadPacks(kv: HostKvApi, date: string): Promise<ApplicationPack[]> {
  const ids = await dayJobIds(kv, date);
  const packs = await Promise.all(ids.map((id) => kv.get(keys.pack(id))));
  return packs.filter(Boolean) as ApplicationPack[];
}
