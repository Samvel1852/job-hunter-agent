import type { JobSource, Region } from '../config.js';

export type JobPosting = {
  id: string;
  source: JobSource;
  title: string;
  company: string;
  location: string;
  region: Region;
  url: string;
  postedAt?: string;
  snippet?: string;
};

export function classifyRegion(location: string, fallback: Region): Region {
  if (/armenia|yerevan|gyumri/i.test(location)) return 'armenia';
  if (/united arab emirates|\buae\b|dubai|abu dhabi|sharjah/i.test(location)) return 'uae';
  if (/\b(usa|united states|u\.s\.)\b/i.test(location) || /\bUS\b/.test(location)) return 'us';
  if (
    /europe|\beu\b|germany|ireland|netherlands|poland|switzerland|france|spain|portugal|italy|sweden|denmark|finland|austria|belgium|czech|estonia|latvia|lithuania|romania|bulgaria|croatia|greece|hungary|slovakia|slovenia|luxembourg|cyprus|malta|berlin|munich|amsterdam|dublin|warsaw|zurich|paris|madrid|lisbon|stockholm/i.test(
      location,
    )
  ) {
    return 'eu';
  }
  if (/, [A-Z]{2}$/.test(location)) return 'us';
  if (/remote|anywhere|worldwide/i.test(location)) return 'remote';
  return fallback;
}
