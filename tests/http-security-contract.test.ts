import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildApp } from '../apps/api/src/app.js';

const TEST_JWT_SECRET = 'release-test-secret-0123456789-abcdefghijk';
const TEST_WITNESS_PASSWORD = 'release-test-witness-password-0123456789';
let environmentLock: Promise<void> = Promise.resolve();

async function withExclusiveEnvironment<T>(
  values: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  let release!: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  const previousLock = environmentLock;
  environmentLock = previousLock.then(() => next);
  await previousLock;

  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    release();
  }
}

async function closeAndRemove(app: Awaited<ReturnType<typeof buildApp>>, dataDir: string): Promise<void> {
  await app.close();
  await fs.rm(dataDir, { recursive: true, force: true });
}

test('HTTP responses expose baseline security and correlation headers', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-http-security-'));
  await withExclusiveEnvironment({ NODE_ENV: 'test' }, async () => {
    const app = await buildApp({ dataDir, persistenceDriver: 'file' });
    t.after(() => closeAndRemove(app, dataDir));
    await app.start(0, '127.0.0.1');
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
});

test('CORS preflight is bounded and returns no response body', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-http-cors-'));
  await withExclusiveEnvironment({
    NODE_ENV: 'production',
    MW_CORS_ORIGINS: 'https://app.example.test',
    JWT_SECRET: TEST_JWT_SECRET,
    WITNESS_KEY_PASSWORD: TEST_WITNESS_PASSWORD,
  }, async () => {
    const app = await buildApp({ dataDir, persistenceDriver: 'file' });
    t.after(() => closeAndRemove(app, dataDir));
    await app.start(0, '127.0.0.1');
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
});

test('rate-limit responses expose Retry-After and bounded response metadata', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-http-rate-'));
  await withExclusiveEnvironment({
    NODE_ENV: 'test',
    MW_RATE_LIMIT_PER_MINUTE: '1',
    MW_TRUST_PROXY: '1',
  }, async () => {
    const app = await buildApp({ dataDir, persistenceDriver: 'file' });
    t.after(() => closeAndRemove(app, dataDir));
    await app.start(0, '127.0.0.1');
    const address = app.server.address();
    assert.ok(address && typeof address === 'object');
    const headers = { 'X-Forwarded-For': '198.51.100.251' };

    const first = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`, { headers });
    assert.equal(first.status, 200);
    const second = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`, { headers });
    assert.equal(second.status, 429);
    assert.equal(second.headers.get('x-ratelimit-limit'), '1');
    assert.equal(second.headers.get('x-ratelimit-remaining'), '0');
    assert.match(second.headers.get('retry-after') ?? '', /^\d+$/);
  });
});
