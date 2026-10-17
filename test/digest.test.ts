import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderDigest, renderMarkdown } from '../bot/lib/digest.js';
import type { ApplicationPack } from '../bot/lib/store.js';

const pack = (overrides: Partial<ApplicationPack> = {}): ApplicationPack => ({
  date: '2026-10-16',
  savedAt: '2026-10-16T05:10:00.000Z',
  job: {
    id: 'linkedin:1',
    source: 'linkedin',
    title: 'Product Owner',
    company: 'Acme <script>',
    location: 'Yerevan, Armenia',
    region: 'armenia',
    url: 'https://www.linkedin.com/jobs/view/1',
    applyUrl: 'https://jobs.acme.com/apply',
  },
  fitScore: 87,
  fitReasons: ['Owned **payments** roadmap'],
  gaps: [],
  headline: 'Product Owner · Payments',
  summary: 'Summary text',
  cvMarkdown: '# Samvel Demirtshyan\n\n## Experience\n- Led <b>team</b>',
  coverLetter: 'Dear team </script><script>alert(1)</script>',
  ...overrides,
});

describe('renderMarkdown', () => {
  it('renders headings, bullets and emphasis with escaping', () => {
    assert.equal(
      renderMarkdown('# Name\n\nSome **bold** text\n- one\n- <two>'),
      '<h1>Name</h1>\n<p>Some <strong>bold</strong> text</p>\n<ul>\n<li>one</li>\n<li>&lt;two&gt;</li>\n</ul>',
    );
  });
});

describe('renderDigest', () => {
  it('sorts by fit and escapes model-written content', () => {
    const html = renderDigest('2026-10-16', [
      pack({ fitScore: 70, job: { ...pack().job, id: 'a', title: 'Low fit' } }),
      pack({ fitScore: 95, job: { ...pack().job, id: 'b', title: 'High fit' } }),
    ]);
    assert.ok(html.indexOf('High fit') < html.indexOf('Low fit'));
    assert.ok(html.includes('Acme &lt;script&gt;'));
    assert.ok(!html.includes('</script><script>alert(1)'));
    assert.ok(html.includes('"applyUrl":"https://jobs.acme.com/apply"'));
  });

  it('falls back to the posting url when there is no safe apply url', () => {
    const html = renderDigest('2026-10-16', [
      pack({ job: { ...pack().job, applyUrl: 'javascript:alert(1)' } }),
    ]);
    assert.ok(html.includes('"applyUrl":"https://www.linkedin.com/jobs/view/1"'));
  });
});
