import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from '../apps/api/src/app.js';
import { createAuthService } from '../src/access/auth.js';

async function json(base: string, route: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${route}`, init);
  return { response, body: await response.json() as any };
}

test('production exposes only minimal public health and requires authority for durable/internal API surfaces', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-production-boundary-'));
  const prior = new Map<string, string | undefined>();
  const env: Record<string, string> = {
    NODE_ENV: 'production',
    JWT_SECRET: 'production-boundary-test-secret-at-least-32-characters',
    WITNESS_KEY_PASSWORD: 'production-witness-test-secret-at-least-32-characters',
    MW_CORS_ORIGINS: 'https://cab.example.test',
    MW_COOKIE_SAME_SITE: 'Lax',
  };
  for (const [key, value] of Object.entries(env)) { prior.set(key, process.env[key]); process.env[key] = value; }
  const bootstrap = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json'), jwtSecret: env.JWT_SECRET });
  bootstrap.createUser({ username: 'production-user', password: 'production-user-password-1', rid: 'RID-PRODUCTION-USER', roles: ['USER'] });
  bootstrap.createUser({ username: 'production-admin', password: 'production-admin-password-1', rid: 'RID-PRODUCTION-ADMIN', roles: ['ADMIN'] });
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('API_TEST_ADDRESS_NOT_AVAILABLE');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await app.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
    for (const [key, value] of prior) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  });

  async function login(username: string, password: string) {
    const result = await json(base, '/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-mw-auth-mode': 'bearer' }, body: JSON.stringify({ username, password }) });
    assert.equal(result.response.status, 200);
    return { authorization: `Bearer ${result.body.accessToken}`, 'content-type': 'application/json' };
  }

  const health = await json(base, '/api/v1/health');
  assert.equal(health.response.status, 200);
  assert.deepEqual(Object.keys(health.body).sort(), ['release', 'status']);
  assert.equal((await json(base, '/api/v1/kernel/graph')).response.status, 401);
  assert.equal((await json(base, '/api/v1/semantic/registry')).response.status, 401);
  assert.equal((await json(base, '/api/v1/jobs/JOB-UNKNOWN')).response.status, 401);
  assert.equal((await json(base, '/api/v1/query', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).response.status, 401);
  assert.equal((await json(base, '/api/v1/observe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payload: { text: 'anonymous durable write' } }) })).response.status, 401);
  assert.equal((await json(base, '/api/v1/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'anonymous durable analysis' }) })).response.status, 401);

  const user = await login('production-user', 'production-user-password-1');
  const admin = await login('production-admin', 'production-admin-password-1');
  assert.equal((await json(base, '/api/v1/observe', { method: 'POST', headers: user, body: JSON.stringify({ entityId: 'PRODUCTION-CASE', payload: { text: 'authenticated observation' } }) })).response.status, 200);
  assert.equal((await json(base, '/api/v1/kernel/graph', { headers: user })).response.status, 403);
  assert.equal((await json(base, '/api/v1/kernel/graph', { headers: admin })).response.status, 200);
  const detailedHealth = await json(base, '/api/v1/health', { headers: admin });
  assert.equal(detailedHealth.response.status, 200);
  assert.equal(detailedHealth.body.storageDriver, 'file');
});
