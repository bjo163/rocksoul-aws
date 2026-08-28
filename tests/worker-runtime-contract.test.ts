import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkerRuntime } from '../src/jobs/worker-runtime.js';

class StubQueue {
  starts = 0;
  stops = 0;
  start(): void { this.starts += 1; }
  stop(): void { this.stops += 1; }
}

test('worker runtime start/stop is idempotent', async () => {
  const queue = new StubQueue();
  const runtime = new WorkerRuntime(queue as never);
  runtime.start();
  runtime.start();
  await runtime.stop();
  await runtime.stop();
  assert.equal(queue.starts, 1);
  assert.equal(queue.stops, 1);
  assert.equal(runtime.isStarted, false);
});

test('worker runtime has a positive bounded drain timeout', () => {
  const queue = new StubQueue();
  assert.equal(new WorkerRuntime(queue as never, { drainTimeoutMs: 15_000 }).drainTimeoutMs, 15_000);
  assert.equal(new WorkerRuntime(queue as never, { drainTimeoutMs: 0 }).drainTimeoutMs, 30_000);
});
