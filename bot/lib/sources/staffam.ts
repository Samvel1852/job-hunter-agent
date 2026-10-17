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
        application_procedures?: Localized;
        job_url?: string;
      };
    };
  };
};

/** staff.am stores the employer's own form in job_url, often as an originUrl on a staff.am wrapper. */
export function staffamCompanyApplyUrl(jobUrl?: string): string | undefined {
  if (!jobUrl) return undefined;
  try {
    const absolute = jobUrl.startsWith('http') ? new URL(jobUrl) : new URL(jobUrl, 'https://staff.am');
    const origin = absolute.searchParams.get('originUrl');
    if (origin && /^https?:\/\//i.test(origin)) {
      const company = new URL(origin);
      if (!company.hostname.endsWith('staff.am')) return company.toString();
    }
    if (!absolute.hostname.endsWith('staff.am')) return absolute.toString();
  } catch {
    return undefined;
  }
  return undefined;
}

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
    ['How to apply', job?.application_procedures],
  ];
  const text = sections
    .filter(([, value]) => value?.en)
    .map(([heading, value]) => `## ${heading}\n${htmlToText(value?.en ?? '')}`)
    .join('\n\n');
  const applyUrl = staffamCompanyApplyUrl(job?.job_url);
  return {
    text: text || htmlToText(html),
    ...(applyUrl ? { applyUrl } : {}),
  };
}
