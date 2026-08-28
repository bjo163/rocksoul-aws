import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFastifyRuntime } from '../apps/api/src/fastify-runtime.js';

test('staging Fastify runtime exposes safe health/readiness contracts', async () => {
  const previous = process.env.MOONWITNESS_ENV;
  process.env.MOONWITNESS_ENV = 'staging';
  const app = await buildFastifyRuntime({ logger: false, telemetry: false });
  try {
    const health = await app.inject({ method: 'GET', url: '/health' });
    const ready = await app.inject({ method: 'GET', url: '/ready' });
    assert.equal(health.statusCode, 200); assert.equal(ready.statusCode, 200);
    assert.equal(health.json().environment, 'staging'); assert.equal(ready.json().status, 'ready');
  } finally { await app.close(); if (previous === undefined) delete process.env.MOONWITNESS_ENV; else process.env.MOONWITNESS_ENV = previous; }
});

test('staging Fastify runtime rejects unsafe write content types', async () => {
  const app = await buildFastifyRuntime({ logger: false, telemetry: false });
  try { const response = await app.inject({ method: 'POST', url: '/test/echo', payload: 'not-json', headers: { 'content-type': 'text/plain' } }); assert.equal(response.statusCode, 415); assert.equal(response.json().error, 'UNSUPPORTED_MEDIA_TYPE'); }
  finally { await app.close(); }
});
