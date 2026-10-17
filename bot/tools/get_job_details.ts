import { defineTool } from '@cursor/bdk/tools';
import { z } from 'zod';
import { extractEmployerEmail } from '../lib/apply.js';
import { DETAIL_HOSTS } from '../lib/config.js';
import { fetchText, htmlToText } from '../lib/http.js';
import { googleCareersApplyUrl } from '../lib/sources/googleCareers.js';
import { getLinkedinPosting } from '../lib/sources/linkedin.js';
import { parseStaffamPosting } from '../lib/sources/staffam.js';

const MAX_TEXT = 9000;

export default defineTool({
  description:
    'Fetch the full description, requirements, employer email, and direct company apply link of one job posting returned by search_jobs. Call it before scoring or tailoring for a job.',
  inputSchema: z.object({ url: z.string().url() }),
  effect: 'read',
  async execute({ url }) {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (
      parsed.protocol !== 'https:' ||
      !DETAIL_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
    ) {
      throw new Error(`Host ${host} is not an allowed job board. Use the posting snippet instead.`);
    }

    const linkedinId = /linkedin\.com\/jobs\/view\/(?:[^/]*-)?(\d+)/.exec(url)?.[1];
    if (linkedinId) {
      const details = await getLinkedinPosting(linkedinId);
      const text = details.text.slice(0, MAX_TEXT);
      return { url, ...details, text, employerEmail: extractEmployerEmail(text) };
    }

    const html = await fetchText(url);
    const details: { text: string; applyUrl?: string } =
      host === 'staff.am' ? parseStaffamPosting(html) : { text: htmlToText(html) };
    const googleApply = host === 'google.com' ? googleCareersApplyUrl(url, html) : undefined;
    const applyUrl = details.applyUrl ?? googleApply;
    const text = details.text.slice(0, MAX_TEXT);
    return {
      url,
      ...(applyUrl ? { applyUrl } : {}),
      employerEmail: extractEmployerEmail(text),
      text,
    };
  },
});
