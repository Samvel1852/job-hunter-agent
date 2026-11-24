import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeDigestJobs,
  parseEmailedJobs,
  planDailyEmail,
  renderDigestIssueBody,
  renderIssueTable,
  roleKey,
  selectJobsToEmail,
  type DeliveredJob,
  type DigestJob,
} from '../bot/lib/emailDigest.js';

function job(id: string, company: string, title: string): DigestJob {
  return { id, company, title, location: 'Remote', source: 'linkedin', score: '80' };
}

function sent(jobs: DigestJob[], date: string, count = jobs.length) {
  return [{ title: `${count} new matches for ${date}`, body: renderIssueTable(jobs) }];
}

describe('digest email dedupe', () => {
  const date = '2026-11-23';
  const roles = [
    job('linkedin:1', 'Acme', 'Product Owner'),
    job('linkedin:2', 'Beta', 'Product Manager'),
    job('linkedin:3', 'Gamma', 'Technical Product Manager | Platform'),
  ];

  it('does not email the same job twice', () => {
    const first = selectJobsToEmail({ jobs: roles, date, delivered: [], priorIssues: [] });
    assert.deepEqual(
      first.map((item) => item.id),
      roles.map((item) => item.id),
    );
    const second = selectJobsToEmail({
      jobs: roles,
      date,
      delivered: roles.map((item) => ({ date, jobId: item.id, fingerprint: roleKey(item.company, item.title) })),
      priorIssues: sent(first, date),
    });
    const emailed = [...first, ...second];
    assert.equal(new Set(emailed.map((item) => item.id)).size, emailed.length);
    assert.deepEqual(second, []);
    const plan = planDailyEmail({
      jobs: roles,
      date,
      delivered: [],
      priorIssues: sent(first, date),
    });
    assert.equal(plan.action, 'skip');
  });

  it('is a no-op when a same-day retry shortens the list', () => {
    const priorIssues = sent(roles, date, 8);
    const shorter = roles.slice(0, 2);
    const delivered: DeliveredJob[] = roles.map((item) => ({
      date,
      jobId: item.id,
      fingerprint: roleKey(item.company, item.title),
    }));
    assert.deepEqual(selectJobsToEmail({ jobs: shorter, date, delivered, priorIssues }), []);
    assert.equal(planDailyEmail({ jobs: shorter, date, delivered, priorIssues }).action, 'skip');
  });

  it('does not send a second email the same day even when the roles differ', () => {
    const extra = job('linkedin:4', 'Delta', 'Product Owner');
    const priorIssues = [{ title: '14 new matches for 2026-11-23', body: renderIssueTable(roles) }];
    const plan = planDailyEmail({
      jobs: [extra],
      date,
      delivered: [],
      priorIssues,
    });
    if (plan.action !== 'skip') assert.fail('a same-day rerun must not send');
    assert.deepEqual(
      plan.additions.map((item) => item.id),
      ['linkedin:4'],
    );
    const body = renderDigestIssueBody({
      date,
      reviewUrl: 'https://example.test/review',
      jobs: mergeDigestJobs(parseEmailedJobs(priorIssues[0].body), plan.additions),
      mention: '@Samvel1852',
    });
    assert.equal(body.split('@Samvel1852').length - 1, 1);
    assert.ok(body.includes('Delta'));
    assert.ok(body.includes('Acme'));
  });

  it('skips a role saved as delivered on an earlier day', () => {
    const selected = selectJobsToEmail({
      jobs: [job('linkedin:9', 'Acme', 'Senior Product Owner')],
      date,
      delivered: [{ date: '2026-11-01', jobId: 'staffam:1', fingerprint: 'acme|product owner' }],
      priorIssues: [],
    });
    assert.deepEqual(selected, []);
  });

  it('sends the first email of the day when no digest issue exists yet', () => {
    const plan = planDailyEmail({ jobs: roles, date, delivered: [], priorIssues: [] });
    if (plan.action !== 'send') assert.fail('the first run of the day should send');
    assert.deepEqual(
      plan.jobs.map((item) => item.id),
      roles.map((item) => item.id),
    );
  });

  it('still emails a job that was saved today and not emailed yet', () => {
    const item = job('linkedin:9', 'Acme', 'Product Owner');
    const selected = selectJobsToEmail({
      jobs: [item],
      date,
      delivered: [{ date, jobId: item.id, fingerprint: 'acme|product owner' }],
      priorIssues: [],
    });
    assert.deepEqual(
      selected.map((entry) => entry.id),
      [item.id],
    );
  });

  it('reads an emailed role back out of the issue table', () => {
    const parsed = parseEmailedJobs(renderIssueTable(roles));
    assert.deepEqual(
      parsed.map((item) => roleKey(item.company, item.title)),
      roles.map((item) => roleKey(item.company, item.title)),
    );
    assert.equal(parsed[2]?.title, 'Technical Product Manager | Platform');
  });
});
