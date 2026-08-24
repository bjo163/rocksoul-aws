import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildApp } from '../apps/api/src/app.js';

test('HTTP responses expose baseline security and correlation headers', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-http-security-'));
  t.after(async () => fs.rm(dataDir, { recursive: true, force: true }));

  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  t.after(() => {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });

  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  t.after(() => app.close());
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/i);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('vary'), null);
});

test('CORS preflight is bounded and returns no response body', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-http-cors-'));
  t.after(async () => fs.rm(dataDir, { recursive: true, force: true }));
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOrigins = process.env.MW_CORS_ORIGINS;
  process.env.NODE_ENV = 'production';
  process.env.MW_CORS_ORIGINS = 'https://app.example.test';
  t.after(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousOrigins === undefined) delete process.env.MW_CORS_ORIGINS;
    else process.env.MW_CORS_ORIGINS = previousOrigins;
  });

  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  t.after(() => app.close());
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');

  const allowed = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://app.example.test', 'Access-Control-Request-Method': 'GET' },
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://app.example.test');
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(await allowed.text(), '');

  const denied = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`, {
    headers: { Origin: 'https://evil.example.test' },
  });
  assert.equal(denied.status, 403);
});

test('rate-limit responses expose Retry-After and bounded response metadata', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-http-rate-'));
  t.after(async () => fs.rm(dataDir, { recursive: true, force: true }));
  const previous = process.env.MW_RATE_LIMIT_PER_MINUTE;
  process.env.MW_RATE_LIMIT_PER_MINUTE = '1';
  t.after(() => {
    if (previous === undefined) delete process.env.MW_RATE_LIMIT_PER_MINUTE;
    else process.env.MW_RATE_LIMIT_PER_MINUTE = previous;
  });

  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  t.after(() => app.close());
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');

  const first = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
  assert.equal(first.status, 200);
  const second = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
  assert.equal(second.status, 429);
  assert.equal(second.headers.get('x-ratelimit-limit'), '1');
  assert.equal(second.headers.get('x-ratelimit-remaining'), '0');
  assert.match(second.headers.get('retry-after') ?? '', /^\d+$/);
});
