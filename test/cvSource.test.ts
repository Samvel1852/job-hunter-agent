import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CANDIDATE } from '../bot/lib/config.js';
import { resolveBaseCv } from '../bot/lib/cvSource.js';

describe('master CV source', () => {
  it('asks for a fresh Canva read when the saved CV is from an older design', () => {
    const result = resolveBaseCv({
      markdown: '# Samvel Demirtshyan\n\nOld layout.',
      source: 'canva',
      updatedAt: '2026-10-17T00:00:00.000Z',
      canvaDesignId: 'DAHYNhleQV4',
    });
    assert.equal(result.status, 'missing');
    assert.equal(result.canvaDesignId, 'DAHY5ieCsr0');
    assert.match(result.canvaDesignUrl, /DAHY5ieCsr0/);
  });

  it('reuses the CV only after it was imported from the current master', () => {
    const result = resolveBaseCv({
      markdown: '# Samvel Demirtshyan\n\nCurrent layout.',
      source: 'canva',
      updatedAt: '2026-10-25T00:00:00.000Z',
      canvaDesignId: CANDIDATE.canvaDesignId,
    });
    assert.equal(result.status, 'ok');
    if (result.status === 'ok') assert.match(result.markdown, /Current layout/);
  });
});
