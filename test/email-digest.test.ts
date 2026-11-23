import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseEmailedJobs,
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
  });

  it('emails only a role that was not already sent', () => {
    const extra = job('linkedin:4', 'Delta', 'Product Owner');
    const selected = selectJobsToEmail({
      jobs: [...roles, extra],
      date,
      delivered: [],
      priorIssues: sent(roles, date),
    });
    assert.deepEqual(
      selected.map((item) => item.id),
      ['linkedin:4'],
    );
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
