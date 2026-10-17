import { defineAgent } from '@cursor/bdk';

export default defineAgent({
  description:
    'Tailoring: given the master CV and one job posting, write the fit analysis, headline, a human professional summary, full CV, and a cover letter of at most two paragraphs.',
});
