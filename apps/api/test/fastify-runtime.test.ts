import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFastifyRuntime } from '../src/fastify-runtime.js';
import { isFastifyEnabled, getRuntimeMode } from '../src/feature-flags.js';

test('Fastify app starts and stops cleanly', async () => {
  const app = await buildFastifyRuntime({ telemetry: false });
  assert.ok(app);
  await app.close();
});

test('/health returns native contract shape with fallback storageDriver', async () => {
  const app = await buildFastifyRuntime({ telemetry: false });
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  const body = response.json() as Record<string, unknown>;
  assert.equal(body.status, 'ok');
  assert.equal(body.release, '4.33.0');
  assert.equal(body.storageDriver, 'file');
  assert.equal(body.environment, process.env.MOONWITNESS_ENV ?? process.env.NODE_ENV ?? 'development');
  assert.equal(body.database, process.env.PGDATABASE ?? null);
  assert.equal(body.needsSetup, true);
  await app.close();
});

test('/ready returns native contract shape with fallback storageDriver', async () => {
  const app = await buildFastifyRuntime({ telemetry: false });
  const response = await app.inject({ method: 'GET', url: '/ready' });
  assert.equal(response.statusCode, 200);
  const body = response.json() as Record<string, unknown>;
  assert.equal(body.status, 'ready');
  assert.equal(body.release, '4.33.0');
  assert.equal(body.storageDriver, 'file');
  await app.close();
});

test('graceful shutdown closes app cleanly', async () => {
  const app = await buildFastifyRuntime({ telemetry: false });
  await app.close();
});

test('feature flag defaults to native when AWS_FASTIFY_RUNTIME is unset', async () => {
  const previousAws = process.env.AWS_FASTIFY_RUNTIME;
  const previousLegacy = process.env.COSMIC_FASTIFY_RUNTIME;
  delete process.env.AWS_FASTIFY_RUNTIME;
  delete process.env.COSMIC_FASTIFY_RUNTIME;
  assert.equal(isFastifyEnabled(), false);
  assert.equal(getRuntimeMode(), 'native');
  if (previousAws !== undefined) process.env.AWS_FASTIFY_RUNTIME = previousAws;
  if (previousLegacy !== undefined) process.env.COSMIC_FASTIFY_RUNTIME = previousLegacy;
});

test('feature flag enables fastify when AWS_FASTIFY_RUNTIME=1', async () => {
  process.env.AWS_FASTIFY_RUNTIME = '1';
  delete process.env.COSMIC_FASTIFY_RUNTIME;
  assert.equal(isFastifyEnabled(), true);
  assert.equal(getRuntimeMode(), 'fastify');
  delete process.env.AWS_FASTIFY_RUNTIME;
});

test('legacy COSMIC_FASTIFY_RUNTIME remains a compatibility fallback', async () => {
  delete process.env.AWS_FASTIFY_RUNTIME;
  process.env.COSMIC_FASTIFY_RUNTIME = '1';
  assert.equal(isFastifyEnabled(), true);
  assert.equal(getRuntimeMode(), 'fastify');
  delete process.env.COSMIC_FASTIFY_RUNTIME;
});

test('AWS_FASTIFY_RUNTIME takes precedence over the legacy flag', async () => {
  process.env.AWS_FASTIFY_RUNTIME = '0';
  process.env.COSMIC_FASTIFY_RUNTIME = '1';
  assert.equal(isFastifyEnabled(), false);
  assert.equal(getRuntimeMode(), 'native');
  delete process.env.AWS_FASTIFY_RUNTIME;
  delete process.env.COSMIC_FASTIFY_RUNTIME;
});

test('correlation ID is generated when missing', async () => {
  const app = await buildFastifyRuntime({ telemetry: false });
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.ok(response.headers['x-request-id']);
  assert.ok(String(response.headers['x-request-id']).length > 0);
  await app.close();
});

test('correlation ID is preserved when present', async () => {
  const app = await buildFastifyRuntime({ telemetry: false });
  const correlationId = 'test-correlation-id';
  const response = await app.inject({
    method: 'GET',
    url: '/health',
    headers: { 'x-request-id': correlationId },
  });
  assert.equal(response.headers['x-request-id'], correlationId);
  await app.close();
});

test('body limit enforces 1MB default', async () => {
  const app = await buildFastifyRuntime({ telemetry: false });
  const largeBody = JSON.stringify({ data: 'x'.repeat(1024 * 1024 + 1) });
  const response = await app.inject({
    method: 'POST',
    url: '/test/echo',
    headers: { 'content-type': 'application/json' },
    payload: largeBody,
  });
  assert.equal(response.statusCode, 413);
  const body = response.json() as Record<string, unknown>;
  assert.equal(body.error, 'Request body is too large');
  await app.close();
});

test('content-type rejection for non-JSON POST', async () => {
  const app = await buildFastifyRuntime({ telemetry: false });
  const response = await app.inject({
    method: 'POST',
    url: '/test/echo',
    headers: { 'content-type': 'text/plain' },
    payload: 'not json',
  });
  assert.equal(response.statusCode, 415);
  const body = response.json() as Record<string, unknown>;
  assert.equal(body.error, 'UNSUPPORTED_MEDIA_TYPE');
  await app.close();
});

test('error serialization hides stack traces in production', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const app = await buildFastifyRuntime({ telemetry: false });
  app.get('/error', async () => {
    throw new Error('internal-detail');
  });
  const response = await app.inject({ method: 'GET', url: '/error' });
  assert.equal(response.statusCode, 500);
  const body = response.json() as Record<string, unknown>;
  assert.equal(body.error, 'INTERNAL_ERROR');
  assert.equal('message' in body, false);
  assert.equal('stack' in body, false);
  await app.close();
  if (previous !== undefined) {
    process.env.NODE_ENV = previous;
  } else {
    delete process.env.NODE_ENV;
  }
});
