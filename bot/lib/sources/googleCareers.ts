import type { Region } from '../config.js';
import { cleanInline, decodeEntities, fetchText } from '../http.js';
import { classifyRegion, type JobPosting } from './types.js';

const BASE = 'https://www.google.com/about/careers/applications';

export function googleCareersSearchUrl(query: string, location?: string) {
  const params = new URLSearchParams({ q: query });
  if (location) params.set('location', location);
  return `${BASE}/jobs/results?${params}`;
}

/** Google Careers puts the real application on a relative ./apply link beside the listing. */
export function googleCareersApplyUrl(listingUrl: string, html: string): string | undefined {
  const match = /href="(\.\/apply\?[^"]+)"/i.exec(html);
  if (!match) return undefined;
  try {
    const url = new URL(decodeEntities(match[1]), listingUrl);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function parseGoogleCareersSearch(html: string, region: Region): JobPosting[] {
  return html
    .split('<h3 class="QJPWVe">')
    .slice(1)
    .map((chunk): JobPosting | undefined => {
      const title = cleanInline(chunk.slice(0, chunk.indexOf('<')));
      const id = /href="jobs\/results\/(\d+)-/.exec(chunk)?.[1];
      if (!title || !id) return undefined;
      const locations = [...chunk.matchAll(/class="r0wTof[^"]*">;?\s*([^<]+)/g)].map((match) =>
        cleanInline(match[1]),
      );
      const location = locations.join('; ');
      const company = /<p class="l103df">([^|<]+)/.exec(chunk)?.[1]?.trim() || 'Google';
      return {
        id: `google-careers:${id}`,
        source: 'google-careers',
        title,
        company,
        location,
        region: classifyRegion(location, region),
        url: `${BASE}/jobs/results/${id}`,
      };
    })
    .filter((job): job is JobPosting => job !== undefined);
}

export async function searchGoogleCareers(query: string, region: Region, location?: string) {
  return parseGoogleCareersSearch(await fetchText(googleCareersSearchUrl(query, location)), region);
}
