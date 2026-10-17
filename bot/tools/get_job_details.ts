import { defineTool } from '@cursor/bdk/tools';
import { z } from 'zod';
import { DETAIL_HOSTS } from '../lib/config.js';
import { fetchText, htmlToText } from '../lib/http.js';
import { getLinkedinPosting } from '../lib/sources/linkedin.js';
import { parseStaffamPosting } from '../lib/sources/staffam.js';

const MAX_TEXT = 9000;

export default defineTool({
  description:
    'Fetch the full description, requirements and direct apply link of one job posting returned by search_jobs. Call it before scoring or tailoring for a job.',
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
      return { url, ...details, text: details.text.slice(0, MAX_TEXT) };
    }

    const html = await fetchText(url);
    const details = host === 'staff.am' ? parseStaffamPosting(html) : { text: htmlToText(html) };
    return { url, applyUrl: url, text: details.text.slice(0, MAX_TEXT) };
  },
});
