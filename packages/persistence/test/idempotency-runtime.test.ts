import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IdempotencyStore, MemoryProvider, initializeRuntimeData, runtimeDataReady, runtimeDataset } from '../src/index.js';

const dir = await mkdtemp(join(tmpdir(), 'moonwitness-persistence-test-'));
try {
  const store = new IdempotencyStore(join(dir, 'idempotency.json'));
  let calls = 0;
  const first = await store.execute('request-1', IdempotencyStore.hash({ a: 1 }), async () => ({ statusCode: 201, body: { calls: ++calls } }));
  const replay = await store.execute('request-1', IdempotencyStore.hash({ a: 1 }), async () => ({ statusCode: 201, body: { calls: ++calls } }));
  assert.deepEqual(replay, first);
  assert.equal(calls, 1);
  await assert.rejects(() => store.execute('request-1', IdempotencyStore.hash({ a: 2 }), async () => ({ statusCode: 200, body: null })), /IDEMPOTENCY_KEY_REUSED/);
  await store.close();

  const persistence = new MemoryProvider();
  await persistence.entityRepository().put({ id: 'DATA-1', type: 'DATASET_SNAPSHOT', payload: { _seed: { path: 'data/test.json' }, data: { answer: 42 } } });
  await initializeRuntimeData(persistence.entityRepository(), { postgres: true });
  assert.equal(runtimeDataReady(), true);
  assert.deepEqual(runtimeDataset('data/test.json'), { answer: 42 });
  console.log('PASS: persistence idempotency + runtime dataset tests');
} finally { await rm(dir, { recursive: true, force: true }); }
