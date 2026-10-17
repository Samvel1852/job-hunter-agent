import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { HostKvApi } from '@cursor/bdk';
import { dayJobIds, rememberDelivered, wasDelivered } from '../bot/lib/store.js';

const emptyKv = { get: async () => undefined } as unknown as HostKvApi;

describe('delivered ledger', () => {
  let dir = '';
  let file = '';
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'delivered-'));
    file = join(dir, 'delivered.json');
  });
  after(() => rm(dir, { recursive: true, force: true }));

  it('remembers a job across an empty key-value store', async () => {
    await rememberDelivered(
      { date: '2026-10-17', jobId: 'staffam:166149', fingerprint: 'optimum partners|technical product owner' },
      file,
    );
    const seen = await wasDelivered(emptyKv, 'other:1', 'optimum partners|technical product owner', file);
    assert.equal(seen?.jobId, 'staffam:166149');
    assert.deepEqual(await dayJobIds(emptyKv, '2026-10-17', file), ['staffam:166149']);
    assert.deepEqual(await dayJobIds(emptyKv, '2026-10-18', file), []);
  });
});
