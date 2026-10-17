import { defineTool } from '@cursor/bdk/tools';
import { z } from 'zod';
import { keys } from '../lib/store.js';

export default defineTool({
  description:
    'Store the master CV as Markdown after importing it from Canva or a PDF, so later runs reuse it. Keep every fact exactly as written in the source.',
  inputSchema: z.object({
    markdown: z.string().min(200),
    source: z.enum(['canva', 'pdf', 'manual']),
  }),
  effect: 'write',
  async execute({ markdown, source }, ctx) {
    const updatedAt = new Date().toISOString();
    await ctx.host.kv.put(keys.baseCv, { markdown, source, updatedAt });
    return { saved: true, source, updatedAt, characters: markdown.length };
  },
});
