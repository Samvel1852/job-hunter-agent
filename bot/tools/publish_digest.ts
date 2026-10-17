import { defineTool } from '@cursor/bdk/tools';
import { z } from 'zod';
import { renderDigest } from '../lib/digest.js';
import { loadPacks, today, writeReviewPage } from '../lib/store.js';

export default defineTool({
  description:
    "Build the review page for a day's saved application packs (default: today). The page previews every tailored CV and cover letter with one-click Apply. Call it after the last save_application.",
  inputSchema: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  effect: 'write',
  async execute({ date }, ctx) {
    const day = date ?? today();
    const packs = await loadPacks(ctx.host.kv, day);
    const html = renderDigest(day, packs);
    const reviewPath = packs.length > 0 ? await writeReviewPage(day, html) : undefined;
    const path = `digests/${day}.html`;
    await ctx.host.files.write(path, html, { scope: 'deployment' });
    const record = await ctx.artifacts.tag({
      kind: 'daily-digest',
      key: `digest:${day}`,
      title: `${packs.length} job matches · ${day}`,
      data: { date: day, count: packs.length, jobIds: packs.map((pack) => pack.job.id) },
      contents: html,
      contentType: 'text/html',
    });
    return {
      date: day,
      count: packs.length,
      artifactId: record.id,
      downloadPath: `/v1/artifacts/${record.id}/content`,
      reviewPath,
      localPath: ctx.host.files.materializedPath(path, { scope: 'deployment' }),
    };
  },
});
