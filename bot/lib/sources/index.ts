import {
  GOOGLE_CAREERS_LOCATIONS,
  GOOGLE_JOBS_LOCATIONS,
  SEARCH_KEYWORDS,
  TITLE_EXCLUDE,
  TITLE_INCLUDE,
  type JobSource,
  type Region,
} from '../config.js';
import { sleep } from '../http.js';
import { searchGoogleCareers } from './googleCareers.js';
import { searchGoogleJobs } from './googleJobs.js';
import { searchLinkedin } from './linkedin.js';
import { searchHimalayas, searchRemoteOk, searchRemotive } from './remoteBoards.js';
import { searchStaffam } from './staffam.js';
import type { JobPosting } from './types.js';

export type { JobPosting } from './types.js';

type Task = { source: JobSource; label: string; run: () => Promise<JobPosting[]> };

export type SourceError = { source: JobSource; query: string; error: string };

const LINKEDIN_DELAY_MS = 600;

function buildTasks(regions: Region[], sources: JobSource[], serpApiKey?: string): Task[] {
  const tasks: Task[] = [];
  const geoRegions = regions.filter(
    (region): region is Exclude<Region, 'remote'> => region !== 'remote',
  );
  const wants = (source: JobSource) => sources.includes(source);
  let linkedinQueries = 0;

  for (const region of geoRegions) {
    for (const keywords of SEARCH_KEYWORDS) {
      if (wants('linkedin')) {
        const delay = LINKEDIN_DELAY_MS * linkedinQueries++;
        tasks.push({
          source: 'linkedin',
          label: `${keywords} @ ${region}`,
          run: async () => {
            await sleep(delay);
            return searchLinkedin(keywords, region);
          },
        });
      }
      if (wants('google-jobs') && serpApiKey) {
        tasks.push({
          source: 'google-jobs',
          label: `${keywords} @ ${region}`,
          run: () => searchGoogleJobs(keywords, region, GOOGLE_JOBS_LOCATIONS[region], serpApiKey),
        });
      }
    }
    if (wants('google-careers')) {
      for (const location of GOOGLE_CAREERS_LOCATIONS[region]) {
        for (const query of ['Product Manager', 'Technical Product Manager']) {
          tasks.push({
            source: 'google-careers',
            label: `${query} @ ${location}`,
            run: () => searchGoogleCareers(query, region, location),
          });
        }
      }
    }
  }

  if (regions.includes('armenia') && wants('staffam')) {
    for (const keywords of ['product manager', 'product owner']) {
      for (const page of [1, 2]) {
        tasks.push({
          source: 'staffam',
          label: `${keywords} p${page}`,
          run: () => searchStaffam(keywords, page),
        });
      }
    }
  }

  if (regions.includes('remote')) {
    if (wants('remotive')) {
      tasks.push({
        source: 'remotive',
        label: 'product manager',
        run: () => searchRemotive('product manager'),
      });
    }
    if (wants('himalayas')) {
      tasks.push({
        source: 'himalayas',
        label: 'product manager',
        run: () => searchHimalayas('product manager'),
      });
      tasks.push({
        source: 'himalayas',
        label: 'product owner',
        run: () => searchHimalayas('product owner'),
      });
    }
    if (wants('remoteok')) {
      tasks.push({ source: 'remoteok', label: 'product', run: () => searchRemoteOk('product') });
    }
  }
  return tasks;
}

export function isProductRole(title: string): boolean {
  return TITLE_INCLUDE.test(title) && !TITLE_EXCLUDE.test(title);
}

export function fingerprint(job: Pick<JobPosting, 'company' | 'title'>): string {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  return `${normalize(job.company)}|${normalize(job.title)}`;
}

export async function collectJobs(options: {
  regions: Region[];
  sources: JobSource[];
  serpApiKey?: string;
}): Promise<{ jobs: JobPosting[]; errors: SourceError[]; queries: number }> {
  const tasks = buildTasks(options.regions, options.sources, options.serpApiKey);
  const settled = await Promise.allSettled(tasks.map((task) => task.run()));
  const errors: SourceError[] = [];
  const byKey = new Map<string, JobPosting>();

  settled.forEach((result, index) => {
    const task = tasks[index];
    if (result.status === 'rejected') {
      errors.push({ source: task.source, query: task.label, error: String(result.reason) });
      return;
    }
    for (const job of result.value) {
      if (!job.url || !isProductRole(job.title)) continue;
      const key = fingerprint(job);
      if (!byKey.has(key)) byKey.set(key, job);
    }
  });

  return { jobs: interleaveByRegion([...byKey.values()]), errors, queries: tasks.length };
}

/** Round-robin across regions so a size cap never drops a whole market. */
export function interleaveByRegion(jobs: JobPosting[]): JobPosting[] {
  const groups = new Map<Region, JobPosting[]>();
  for (const job of jobs) groups.set(job.region, [...(groups.get(job.region) ?? []), job]);
  const queues = [...groups.values()];
  const result: JobPosting[] = [];
  while (result.length < jobs.length) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) result.push(next);
    }
  }
  return result;
}
