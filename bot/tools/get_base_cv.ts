import { defineTool } from '@cursor/bdk/tools';
import { z } from 'zod';
import { resolveBaseCv } from '../lib/cvSource.js';
import { keys, type BaseCv } from '../lib/store.js';

export default defineTool({
  description:
    "Load the candidate's master CV (Markdown). Status 'missing' means the current Canva master has not been imported yet: read canvaDesignUrl and store it with save_base_cv before tailoring. An older saved CV is not reused.",
  inputSchema: z.object({}),
  effect: 'read',
  async execute(_input, ctx) {
    const stored = (await ctx.host.kv.get(keys.baseCv)) as BaseCv | undefined;
    return resolveBaseCv(stored);
  },
});
