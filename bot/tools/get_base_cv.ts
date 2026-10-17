import { readFile } from 'node:fs/promises';
import { defineTool } from '@cursor/bdk/tools';
import { z } from 'zod';
import { CANDIDATE } from '../lib/config.js';
import { keys, type BaseCv } from '../lib/store.js';

const CV_FILE = new URL('../../cv/base-cv.md', import.meta.url);
const TEMPLATE_MARKER = '<!-- TEMPLATE: replace with your CV -->';

export default defineTool({
  description:
    "Load the candidate's master CV (Markdown). Status 'missing' means it has not been imported yet: read it from Canva and store it with save_base_cv first.",
  inputSchema: z.object({}),
  effect: 'read',
  async execute(_input, ctx) {
    const stored = (await ctx.host.kv.get(keys.baseCv)) as BaseCv | undefined;
    if (stored?.markdown) {
      return { status: 'ok', ...stored, canvaDesignUrl: CANDIDATE.canvaDesignUrl };
    }
    const file = await readFile(CV_FILE, 'utf8').catch(() => '');
    if (file.trim() && !file.includes(TEMPLATE_MARKER)) {
      return {
        status: 'ok',
        markdown: file,
        source: 'cv/base-cv.md',
        canvaDesignUrl: CANDIDATE.canvaDesignUrl,
      };
    }
    return {
      status: 'missing',
      canvaDesignId: CANDIDATE.canvaDesignId,
      canvaDesignUrl: CANDIDATE.canvaDesignUrl,
    };
  },
});
