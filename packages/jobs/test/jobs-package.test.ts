import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkerRuntime, isTerminalJobStatus } from '../src/index.ts';

test('jobs package exposes terminal status semantics', () => {
  assert.equal(isTerminalJobStatus('COMPLETED'), true);
  assert.equal(isTerminalJobStatus('FAILED'), true);
  assert.equal(isTerminalJobStatus('QUEUED'), false);
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
