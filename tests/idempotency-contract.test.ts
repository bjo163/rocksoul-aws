import test from 'node:test';
import assert from 'node:assert/strict';
import { IdempotencyStore } from '../src/persistence/idempotency.js';

test('file idempotency returns the same result and rejects payload reuse', async (t) => {
  const store = new IdempotencyStore();
  t.after(() => store.close());
  const first = await store.execute('K-1', 'hash-a', async () => ({ statusCode: 201, body: { id: 'CASE-1' } }));
  assert.deepEqual(first, { statusCode: 201, body: { id: 'CASE-1' } });
  const replay = await store.execute('K-1', 'hash-a', async () => ({ statusCode: 500, body: { id: 'WRONG' } }));
  assert.deepEqual(replay, first);
  await assert.rejects(() => store.execute('K-1', 'hash-b', async () => ({ statusCode: 201, body: { id: 'CASE-2' } })), /IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD/);
});

test('idempotency hash is deterministic for equivalent JSON values', () => {
  assert.equal(IdempotencyStore.hash({ a: 1 }), IdempotencyStore.hash({ a: 1 }));
  assert.notEqual(IdempotencyStore.hash({ a: 1 }), IdempotencyStore.hash({ a: 2 }));
});
