import { cleanInline, fetchJson } from '../http.js';
import { classifyRegion, type JobPosting } from './types.js';

const SNIPPET_LENGTH = 400;

const snippet = (html?: string) => (html ? cleanInline(html).slice(0, SNIPPET_LENGTH) : undefined);

type RemotiveResponse = {
  jobs: Array<{
    id: number;
    url: string;
    title: string;
    company_name: string;
    candidate_required_location: string;
    publication_date: string;
    description: string;
  }>;
};

export async function searchRemotive(query: string): Promise<JobPosting[]> {
  const params = new URLSearchParams({ search: query, limit: '50' });
  const data = await fetchJson<RemotiveResponse>(`https://remotive.com/api/remote-jobs?${params}`);
  return data.jobs.map((job) => ({
    id: `remotive:${job.id}`,
    source: 'remotive',
    title: cleanInline(job.title),
    company: job.company_name,
    location: `Remote (${job.candidate_required_location})`,
    region: classifyRegion(job.candidate_required_location, 'remote'),
    url: job.url,
    postedAt: job.publication_date,
    snippet: snippet(job.description),
  }));
}

type HimalayasResponse = {
  jobs: Array<{
    guid: string;
    applicationLink: string;
    title: string;
    companyName: string;
    locationRestrictions?: string[];
    pubDate?: number;
    excerpt?: string;
  }>;
};

export async function searchHimalayas(query: string): Promise<JobPosting[]> {
  const params = new URLSearchParams({ q: query, limit: '20' });
  const data = await fetchJson<HimalayasResponse>(
    `https://himalayas.app/jobs/api/search?${params}`,
  );
  return data.jobs.map((job) => {
    const restrictions = job.locationRestrictions?.join(', ') || 'Worldwide';
    return {
      id: `himalayas:${job.guid}`,
      source: 'himalayas',
      title: cleanInline(job.title),
      company: job.companyName,
      location: `Remote (${restrictions})`,
      region: classifyRegion(restrictions, 'remote'),
      url: job.applicationLink || job.guid,
      postedAt: job.pubDate ? new Date(job.pubDate * 1000).toISOString() : undefined,
      snippet: snippet(job.excerpt),
    };
  });
}

type RemoteOkJob = {
  id?: string;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  date?: string;
  description?: string;
};

export async function searchRemoteOk(tag: string): Promise<JobPosting[]> {
  const data = await fetchJson<RemoteOkJob[]>(
    `https://remoteok.com/api?tag=${encodeURIComponent(tag)}`,
  );
  return data
    .filter((job) => job.id && job.position && job.url)
    .map((job) => ({
      id: `remoteok:${job.id}`,
      source: 'remoteok',
      title: cleanInline(job.position ?? ''),
      company: job.company ?? '',
      location: `Remote${job.location ? ` (${job.location})` : ''}`,
      region: classifyRegion(job.location ?? '', 'remote'),
      url: job.url ?? '',
      postedAt: job.date,
      snippet: snippet(job.description),
    }));
}
