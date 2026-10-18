import { defineTool } from '@cursor/bdk/tools';
import { z } from 'zod';
import { DAILY_LIMIT } from '../lib/config.js';
import { isShortCoverLetter } from '../lib/letter.js';
import { fingerprint } from '../lib/sources/index.js';
import { dayJobIds, keys, rememberDelivered, today, wasDelivered, type ApplicationPack } from '../lib/store.js';

export default defineTool({
  description:
    "Save one reviewed job's application pack (fit analysis, tailored headline, summary, full CV and cover letter) into today's shortlist. Enforces the daily limit and never accepts a job delivered before.",
  inputSchema: z.object({
    job: z.object({
      id: z.string(),
      source: z.string(),
      title: z.string(),
      company: z.string(),
      location: z.string(),
      region: z.string(),
      url: z.string().url(),
      applyUrl: z.string().url().optional(),
      employerEmail: z.string().email().optional(),
    }),
    fitScore: z.number().min(0).max(100),
    fitReasons: z.array(z.string()).min(1).max(6),
    gaps: z.array(z.string()).max(5),
    headline: z.string().min(10).max(220),
    summary: z.string().min(150).max(1200),
    cvMarkdown: z.string().min(400),
    coverLetter: z
      .string()
      .refine(isShortCoverLetter, 'Cover letter must be the short note: Dear Hiring Team, three paragraphs, Best regards, Samvel Demirtshyan.'),
    canvaUrl: z.string().url().optional(),
  }),
  effect: 'write',
  dryRunResult: ({ job }) => ({ saved: false, jobId: job.id, dryRun: true }),
  async execute(input, ctx) {
    const { kv } = ctx.host;
    const date = today();
    const fp = fingerprint(input.job);
    const ids = await dayJobIds(kv, date);

    if (ids.includes(input.job.id)) {
      await kv.put(keys.pack(input.job.id), { ...input, date, savedAt: new Date().toISOString() });
      await rememberDelivered({ date, jobId: input.job.id, fingerprint: fp });
      return { saved: true, updated: true, jobId: input.job.id, todayCount: ids.length };
    }
    const seen = await wasDelivered(kv, input.job.id, fp);
    if (seen) {
      throw new Error(`Already delivered on ${seen.date} (${seen.jobId}). Pick another job.`);
    }
    if (ids.length >= DAILY_LIMIT) {
      throw new Error(`Daily limit of ${DAILY_LIMIT} reached for ${date}. Call publish_digest.`);
    }

    const pack: ApplicationPack = { ...input, date, savedAt: new Date().toISOString() };
    const seenRecord = { date, jobId: input.job.id, fingerprint: fp };
    await rememberDelivered(seenRecord);
    await kv.put(keys.pack(input.job.id), pack);
    await kv.put(keys.seenJob(input.job.id), seenRecord);
    await kv.put(keys.seenFingerprint(fp), seenRecord);
    await kv.put(keys.day(date), [...ids, input.job.id]);

    await ctx.artifacts.tag({
      kind: 'application',
      key: `application:${input.job.id}`,
      title: `${input.job.title} · ${input.job.company}`,
      data: {
        date,
        jobId: input.job.id,
        title: input.job.title,
        company: input.job.company,
        url: input.job.url,
        fitScore: input.fitScore,
      },
      contents: `${input.cvMarkdown}\n\n---\n\n# Cover letter\n\n${input.coverLetter}`,
      contentType: 'text/markdown',
    });

    return {
      saved: true,
      jobId: input.job.id,
      todayCount: ids.length + 1,
      remainingToday: DAILY_LIMIT - ids.length - 1,
    };
  },
});
