import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from '../apps/api/src/app.js';
import { createAuthService } from '../src/access/auth.js';

function cookieHeader(response: Response): string {
  const values: string[] = (response.headers as any).getSetCookie?.() ?? [response.headers.get('set-cookie') ?? ''];
  return values.filter(Boolean).map((value) => value.split(';')[0]).join('; ');
}

async function createTestApp(dataDir: string, authRateLimit = '100') {
  const oldCors = process.env.MW_CORS_ORIGINS;
  const oldAuthRate = process.env.MW_AUTH_RATE_LIMIT_PER_MINUTE;
  const oldNodeEnv = process.env.NODE_ENV;
  const oldTrustProxy = process.env.MW_TRUST_PROXY;
  process.env.MW_CORS_ORIGINS = 'http://127.0.0.1:4174';
  process.env.MW_AUTH_RATE_LIMIT_PER_MINUTE = authRateLimit;
  process.env.MW_TRUST_PROXY = '1';
  const jwtSecret = 'moonwitness-development-secret-12345';
  const bootstrap = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json'), jwtSecret });
  bootstrap.createUser({ username: 'browser-user', password: 'browser-password-123', rid: 'MW-BROWSER-1', roles: ['ADMIN'] });
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  return {
    app,
    restore() {
      if (oldCors === undefined) delete process.env.MW_CORS_ORIGINS; else process.env.MW_CORS_ORIGINS = oldCors;
      if (oldAuthRate === undefined) delete process.env.MW_AUTH_RATE_LIMIT_PER_MINUTE; else process.env.MW_AUTH_RATE_LIMIT_PER_MINUTE = oldAuthRate;
      if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
      if (oldTrustProxy === undefined) delete process.env.MW_TRUST_PROXY; else process.env.MW_TRUST_PROXY = oldTrustProxy;
    },
  };
}

test('browser auth uses HttpOnly cookies, rotates refresh, and revokes the session', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-cookie-auth-lifecycle-'));
  const { app, restore } = await createTestApp(dataDir, '100');
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('API_TEST_ADDRESS_NOT_AVAILABLE');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await app.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
    restore();
  });

  const browserHeaders = { origin: 'http://127.0.0.1:4174', 'x-forwarded-for': '198.51.100.10' };
  const login = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { ...browserHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ username: 'browser-user', password: 'browser-password-123' }) });
  const loginBody = await login.json() as any;
  assert.equal(login.status, 200);
  assert.equal(loginBody.transport, 'cookie');
  assert.equal(loginBody.token, undefined);
  assert.equal(loginBody.refreshToken, undefined);
  assert.equal(login.headers.get('access-control-allow-origin'), 'http://127.0.0.1:4174');
  assert.equal(login.headers.get('access-control-allow-credentials'), 'true');
  const firstCookies = cookieHeader(login);
  assert.match(firstCookies, /mw_access=/);
  assert.match(firstCookies, /mw_refresh=/);
  assert.match(login.headers.get('set-cookie') ?? '', /HttpOnly/i);

  const me = await fetch(`${base}/api/v1/auth/me`, { headers: { ...browserHeaders, cookie: firstCookies } });
  assert.equal(me.status, 200);
  assert.equal((await me.json() as any).rid, 'MW-BROWSER-1');

  const refresh = await fetch(`${base}/api/v1/auth/refresh`, { method: 'POST', headers: { ...browserHeaders, cookie: firstCookies } });
  assert.equal(refresh.status, 200);
  const secondCookies = cookieHeader(refresh);
  assert.notEqual(secondCookies, firstCookies);

  const replay = await fetch(`${base}/api/v1/auth/refresh`, { method: 'POST', headers: { ...browserHeaders, cookie: firstCookies } });
  assert.equal(replay.status, 401, 'rotated refresh cookie cannot be replayed');

  const logout = await fetch(`${base}/api/v1/auth/logout`, { method: 'POST', headers: { ...browserHeaders, cookie: secondCookies } });
  assert.equal(logout.status, 200);
  const revoked = await fetch(`${base}/api/v1/auth/me`, { headers: { ...browserHeaders, cookie: secondCookies } });
  assert.equal(revoked.status, 401);

  process.env.NODE_ENV = 'production';
  const disallowedOrigin = await fetch(`${base}/api/v1/health`, { headers: { origin: 'https://untrusted.example', 'x-forwarded-for': '198.51.100.11' } });
  assert.equal(disallowedOrigin.status, 403);
  assert.equal((await disallowedOrigin.json() as any).error, 'ORIGIN_NOT_ALLOWED');
});

test('auth rate limiting throttles repeated login attempts independently of session lifecycle', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-cookie-auth-throttle-'));
  const { app, restore } = await createTestApp(dataDir, '3');
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('API_TEST_ADDRESS_NOT_AVAILABLE');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await app.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
    restore();
  });

  const headers = { origin: 'http://127.0.0.1:4174', 'x-forwarded-for': '198.51.100.20', 'content-type': 'application/json' };
  const invalid = { method: 'POST', headers, body: JSON.stringify({ username: 'browser-user', password: 'wrong-password' }) } as const;
  const first = await fetch(`${base}/api/v1/auth/login`, invalid);
  const second = await fetch(`${base}/api/v1/auth/login`, invalid);
  const third = await fetch(`${base}/api/v1/auth/login`, invalid);
  assert.equal(first.status, 401);
  assert.equal(second.status, 401);
  assert.equal(third.status, 401);

  const throttled = await fetch(`${base}/api/v1/auth/login`, invalid);
  assert.equal(throttled.status, 429);
  assert.ok(Number(throttled.headers.get('retry-after')) >= 1);
  assert.equal(throttled.headers.get('x-ratelimit-remaining'), '0');
});