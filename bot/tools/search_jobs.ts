import { prompt } from '@cursor/bdk';
import { defineTool } from '@cursor/bdk/tools';
import { z } from 'zod';
import { ALL_REGIONS, ALL_SOURCES } from '../lib/config.js';
import { collectJobs, fingerprint } from '../lib/sources/index.js';
import { dayJobIds, today, wasDelivered } from '../lib/store.js';
import { DAILY_LIMIT } from '../lib/config.js';

const MAX_RESULTS = 150;

export default defineTool({
  description: prompt`
    Search LinkedIn, staff.am, Google Careers, Google Jobs (when SERPAPI_API_KEY is set),
    Remotive, Himalayas and RemoteOK for Product Manager / Product Owner roles in Armenia, the EU,
    the US, the UAE and remote. RemoteOK listings are included only when the posting states a
    hiring email, because RemoteOK's own Apply button requires a paid account. Results are
    already filtered to product titles and exclude every job delivered on a previous day, so
    anything returned is safe to propose.
  `,
  inputSchema: z.object({
    regions: z.array(z.enum(ALL_REGIONS as [string, ...string[]])).optional(),
    sources: z.array(z.enum(ALL_SOURCES as [string, ...string[]])).optional(),
  }),
  effect: 'read',
  async execute({ regions, sources }, ctx) {
    const { jobs, errors, queries } = await collectJobs({
      regions: (regions ?? ALL_REGIONS) as typeof ALL_REGIONS,
      sources: (sources ?? ALL_SOURCES) as typeof ALL_SOURCES,
      serpApiKey: process.env.SERPAPI_API_KEY || undefined,
    });

    const fresh = [];
    for (const job of jobs) {
      if (!(await wasDelivered(ctx.host.kv, job.id, fingerprint(job)))) fresh.push(job);
    }

    const date = today();
    const deliveredToday = (await dayJobIds(ctx.host.kv, date)).length;
    return {
      date,
      queries,
      fetched: jobs.length,
      newCandidates: fresh.length,
      deliveredToday,
      remainingToday: Math.max(0, DAILY_LIMIT - deliveredToday),
      sourceErrors: errors,
      jobs: fresh.slice(0, MAX_RESULTS),
    };
  },
});
