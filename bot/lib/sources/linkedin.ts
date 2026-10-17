import { LINKEDIN_GEO_IDS, LINKEDIN_POSTED_WITHIN, type Region } from '../config.js';
import { cleanInline, decodeEntities, fetchText, htmlToText } from '../http.js';
import { classifyRegion, type JobPosting } from './types.js';

export function linkedinSearchUrl(keywords: string, region: Exclude<Region, 'remote'>, start = 0) {
  const params = new URLSearchParams({
    keywords,
    geoId: LINKEDIN_GEO_IDS[region],
    f_TPR: LINKEDIN_POSTED_WITHIN,
    start: String(start),
  });
  return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`;
}

export function parseLinkedinSearch(html: string, region: Region): JobPosting[] {
  return html
    .split(/<li>/)
    .map((card): JobPosting | undefined => {
      const id = /urn:li:jobPosting:(\d+)/.exec(card)?.[1];
      const title = /base-search-card__title[^>]*>([\s\S]*?)<\/h3>/.exec(card)?.[1];
      if (!id || !title) return undefined;
      const company = /base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/.exec(card)?.[1] ?? '';
      const location = /job-search-card__location[^>]*>([\s\S]*?)<\/span>/.exec(card)?.[1] ?? '';
      const cleanLocation = cleanInline(location);
      return {
        id: `linkedin:${id}`,
        source: 'linkedin',
        title: cleanInline(title),
        company: cleanInline(company),
        location: cleanLocation,
        region: classifyRegion(cleanLocation, region),
        url: `https://www.linkedin.com/jobs/view/${id}`,
        postedAt: /datetime="([^"]+)"/.exec(card)?.[1],
      };
    })
    .filter((job): job is JobPosting => job !== undefined);
}

export async function searchLinkedin(keywords: string, region: Exclude<Region, 'remote'>) {
  return parseLinkedinSearch(await fetchText(linkedinSearchUrl(keywords, region)), region);
}

export type JobDetails = { text: string; applyUrl?: string; criteria?: string[] };

export function parseLinkedinPosting(html: string): JobDetails {
  const markup = /show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
  const applyUrl = /<code id="applyUrl"[^>]*><!--"([^"]+)"--><\/code>/.exec(html)?.[1];
  const criteria = [
    ...html.matchAll(/description__job-criteria-text[^>]*>([\s\S]*?)<\/span>/g),
  ].map((match) => cleanInline(match[1]));
  return {
    text: htmlToText(markup),
    applyUrl: applyUrl ? decodeEntities(applyUrl) : undefined,
    criteria,
  };
}

export async function getLinkedinPosting(jobId: string) {
  return parseLinkedinPosting(
    await fetchText(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`),
  );
}
