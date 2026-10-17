import { cleanInline, fetchText, htmlToText, readNextData } from '../http.js';
import type { JobDetails } from './linkedin.js';
import type { JobPosting } from './types.js';

type Localized = { en?: string };

type StaffJob = {
  id?: number;
  title?: Localized;
  slug?: Localized;
  category?: { code?: string };
  companiesStruct?: { title?: Localized };
  job_city?: { title?: Localized };
  activated_at?: { staffam?: string };
  is_remote?: boolean;
};

type StaffListData = { props?: { pageProps?: { jobs?: StaffJob[] } } };

type StaffJobData = {
  props?: {
    pageProps?: {
      job?: {
        description?: Localized;
        responsibilities?: Localized;
        required_qualifications?: Localized;
        additional_information?: Localized;
      };
    };
  };
};

export function staffamSearchUrl(keywords: string, page = 1) {
  const params = new URLSearchParams({ key_word: keywords, page: String(page) });
  return `https://staff.am/en/jobs?${params}`;
}

export function parseStaffamSearch(html: string): JobPosting[] {
  const jobs = readNextData<StaffListData>(html)?.props?.pageProps?.jobs ?? [];
  return jobs
    .filter((job) => job.id && job.title?.en && job.slug?.en && job.category?.code)
    .map((job) => {
      const city = job.job_city?.title?.en ?? 'Yerevan';
      return {
        id: `staffam:${job.id}`,
        source: 'staffam' as const,
        title: cleanInline(job.title?.en ?? ''),
        company: cleanInline(job.companiesStruct?.title?.en ?? ''),
        location: `${city}, Armenia${job.is_remote ? ' (remote)' : ''}`,
        region: 'armenia' as const,
        url: `https://staff.am/en/jobs/${job.category?.code}/${job.slug?.en}`,
        postedAt: job.activated_at?.staffam,
      };
    });
}

export async function searchStaffam(keywords: string, page = 1) {
  return parseStaffamSearch(await fetchText(staffamSearchUrl(keywords, page)));
}

export function parseStaffamPosting(html: string): JobDetails {
  const job = readNextData<StaffJobData>(html)?.props?.pageProps?.job;
  const sections: Array<[string, Localized | undefined]> = [
    ['Description', job?.description],
    ['Responsibilities', job?.responsibilities],
    ['Required qualifications', job?.required_qualifications],
    ['Additional information', job?.additional_information],
  ];
  const text = sections
    .filter(([, value]) => value?.en)
    .map(([heading, value]) => `## ${heading}\n${htmlToText(value?.en ?? '')}`)
    .join('\n\n');
  return { text: text || htmlToText(html) };
}
