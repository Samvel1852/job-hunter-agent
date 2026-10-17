import { defineArtifacts } from '@cursor/bdk/artifacts';
import { z } from 'zod';

export default defineArtifacts({
  kinds: {
    application: {
      description: 'One job application pack: tailored CV and cover letter for a single posting.',
      schema: z.object({
        date: z.string(),
        jobId: z.string(),
        title: z.string(),
        company: z.string(),
        url: z.string(),
        fitScore: z.number(),
      }),
    },
    'daily-digest': {
      description: "The day's review page with every application pack and one-click Apply.",
      schema: z.object({
        date: z.string(),
        count: z.number(),
        jobIds: z.array(z.string()),
      }),
    },
  },
});
