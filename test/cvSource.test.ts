import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CANDIDATE } from '../bot/lib/config.js';
import { resolveBaseCv } from '../bot/lib/cvSource.js';

describe('master CV source', () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  it('asks for a fresh Canva read when the saved CV is from an older design', () => {
    const result = resolveBaseCv({
      markdown: '# Samvel Demirtshyan\n\nOld layout.',
      source: 'canva',
      updatedAt: yesterday.toISOString(),
      canvaDesignId: 'DAHYNhleQV4',
    });
    assert.equal(result.status, 'missing');
    assert.equal(result.canvaDesignId, 'DAHZCxr0zlo');
    assert.match(result.canvaDesignUrl, /DAHZCxr0zlo/);
  });

  it('asks for a fresh Canva read when the current design was not refreshed today', () => {
    const result = resolveBaseCv({
      markdown: '# Samvel Demirtshyan\n\nYesterday copy.',
      source: 'canva',
      updatedAt: yesterday.toISOString(),
      canvaDesignId: CANDIDATE.canvaDesignId,
    });
    assert.equal(result.status, 'missing');
  });

  it('reuses the CV only after it was imported from the current master today', () => {
    const result = resolveBaseCv({
      markdown: '# Samvel Demirtshyan\n\nCurrent layout.',
      source: 'canva',
      updatedAt: now.toISOString(),
      canvaDesignId: CANDIDATE.canvaDesignId,
    });
    assert.equal(result.status, 'ok');
    if (result.status === 'ok') assert.match(result.markdown, /Current layout/);
  });
});
