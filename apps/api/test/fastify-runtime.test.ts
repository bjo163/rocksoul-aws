import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFastifyRuntime } from '../src/fastify-runtime.js';

test('transitional Fastify runtime exposes health and readiness without native API replacement', async () => {
  const app = await buildFastifyRuntime({ telemetry: false });
  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.json(), { ok: true, runtime: 'fastify', phase: 'transitional' });
  const ready = await app.inject({ method: 'GET', url: '/ready' });
  assert.equal(ready.statusCode, 200);
  await app.close();
});
