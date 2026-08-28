import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { UniverseStore } from '../src/universe-store.js';

test('UniverseStore persists a case, event, and derived evidence', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'moonwitness-universe-'));
  const store = new UniverseStore({ dataDir, driver: 'file' });
  try {
    const aggregate = await store.upsertCase({ id: 'CASE-PACKAGE-1', observation: { text: 'hello' }, analysis: { sourceMatches: [{ type: 'QURAN', confidence: 0.8 }] } });
    assert.equal((await store.getCase(aggregate.id))?.id, aggregate.id);
    assert.equal((await store.listCaseEvents(aggregate.id)).length, 1);
    assert.equal((await store.listCaseEvidence(aggregate.id)).length, 1);
  } finally {
    await store.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
