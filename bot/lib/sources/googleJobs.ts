import type { Region } from '../config.js';
import { fetchJson } from '../http.js';
import { classifyRegion, type JobPosting } from './types.js';

type SerpApiResponse = {
  error?: string;
  jobs_results?: Array<{
    job_id: string;
    title: string;
    company_name: string;
    location?: string;
    description?: string;
    share_link?: string;
    apply_options?: Array<{ link: string }>;
    detected_extensions?: { posted_at?: string };
  }>;
};

/** Google Jobs aggregator results via SerpAPI. Only runs when `SERPAPI_API_KEY` is set. */
export async function searchGoogleJobs(
  query: string,
  region: Region,
  location: string,
  apiKey: string,
): Promise<JobPosting[]> {
  const params = new URLSearchParams({
    engine: 'google_jobs',
    q: query,
    location,
    api_key: apiKey,
  });
  const data = await fetchJson<SerpApiResponse>(`https://serpapi.com/search.json?${params}`);
  if (data.error) throw new Error(data.error);
  return (data.jobs_results ?? []).map((job) => {
    const jobLocation = job.location ?? location;
    return {
      id: `google-jobs:${job.job_id}`,
      source: 'google-jobs',
      title: job.title,
      company: job.company_name,
      location: jobLocation,
      region: classifyRegion(jobLocation, region),
      url: job.apply_options?.[0]?.link ?? job.share_link ?? '',
      postedAt: job.detected_extensions?.posted_at,
      snippet: job.description?.slice(0, 400),
    };
  });
}
