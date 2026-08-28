import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkerRuntime, isTerminalJobStatus, PersistentJobQueue } from '../src/index.ts';
import { MemoryProvider } from '../../persistence/src/memory.ts';

test('jobs package exposes terminal status semantics', () => {
  assert.equal(isTerminalJobStatus('COMPLETED'), true);
  assert.equal(isTerminalJobStatus('FAILED'), true);
  assert.equal(isTerminalJobStatus('DEAD_LETTER'), true);
  assert.equal(isTerminalJobStatus('QUEUED'), false);
});

test('job retries with backoff before moving to dead letter', async () => {
  let now = new Date('2026-01-01T00:00:00.000Z');
  const queue = new PersistentJobQueue(new MemoryProvider(), 5000, { workerId: 'one', maxAttempts: 2, retryBaseMs: 100, now: () => now });
  queue.register('fail', async () => { throw new Error('transient'); });
  const job = await queue.enqueue('fail', { a: 1 });
  assert.equal((await queue.processAvailable())[0]?.status, 'QUEUED');
  assert.equal((await queue.get(job.id))?.attemptCount, 1);
  assert.equal((await queue.processAvailable()).length, 0);
  now = new Date(now.getTime() + 100);
  assert.equal((await queue.processAvailable())[0]?.status, 'DEAD_LETTER');
});

test('job idempotency and expired leases prevent duplicate work', async () => {
  let now = new Date('2026-01-01T00:00:00.000Z');
  const store = new MemoryProvider();
  const first = new PersistentJobQueue(store, 5000, { workerId: 'first', now: () => now, leaseMs: 100 });
  const second = new PersistentJobQueue(store, 5000, { workerId: 'second', now: () => now, leaseMs: 100 });
  const a = await first.enqueue('echo', { a: 1 }, 'request-1'); const b = await second.enqueue('echo', { a: 2 }, 'request-1');
  assert.equal(a.id, b.id);
  first.register('echo', async payload => payload);
  assert.equal((await first.processAvailable())[0]?.status, 'COMPLETED');
  const stuck = await first.enqueue('stuck', {}, 'request-2');
  const claim = await store.jobRepository().claimAvailable!(1, 'dead-worker', new Date(now.getTime() + 100).toISOString(), now.toISOString());
  assert.equal(claim[0]?.id, stuck.id);
  second.register('stuck', async () => 'reclaimed'); now = new Date(now.getTime() + 101);
  assert.equal((await second.processAvailable())[0]?.result, 'reclaimed');
});

test('worker runtime lifecycle is idempotent and bounded', async () => {
  const calls = { start: 0, stop: 0 };
  const queue = { start: () => { calls.start += 1; }, stop: () => { calls.stop += 1; } };
  const runtime = new WorkerRuntime(queue, { drainTimeoutMs: 0 });
  runtime.start(); runtime.start(); await runtime.stop(); await runtime.stop();
  assert.deepEqual(calls, { start: 1, stop: 1 });
  assert.equal(runtime.isStarted, false);
  assert.equal(runtime.drainTimeoutMs, 30_000);
});
