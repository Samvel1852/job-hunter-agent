import { defineEval, includes } from '@cursor/bdk/evals';

export default defineEval({
  tags: ['smoke'],
  description: 'A focused search request loads the CV, searches jobs, and answers with a table.',
  async test(t) {
    await t.send(
      'Do not save anything. Search only Armenia and list the 3 most relevant Product Owner or Product Manager roles you find, with fit scores.',
    );
    t.succeeded();
    t.calledTool('get_base_cv');
    t.calledTool('search_jobs');
    t.check(t.reply, includes(/\|\s*Fit\s*\|/i));
  },
});
