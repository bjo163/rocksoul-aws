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

test('Flow reconstructs the committed result when final state survives but the idempotency response is lost', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-flow-recovery-'));
  const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json'), jwtSecret: 'flow-recovery-test-secret-123456789' });
  auth.createUser({ username: 'flow-recovery-admin', password: 'flow-recovery-password-1', rid: 'RID-FLOW-RECOVERY', roles: ['ADMIN'] });
  let app = await buildApp({ dataDir, persistenceDriver: 'file' });
  let closed = false;
  t.after(async () => {
    if (!closed) await app.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  async function start() {
    await app.start(0, '127.0.0.1');
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('API_TEST_ADDRESS_NOT_AVAILABLE');
    return `http://127.0.0.1:${address.port}`;
  }

  async function login(base: string) {
    const result = await json(base, '/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-mw-auth-mode': 'bearer' }, body: JSON.stringify({ username: 'flow-recovery-admin', password: 'flow-recovery-password-1' }) });
    assert.equal(result.response.status, 200);
    return { authorization: `Bearer ${result.body.accessToken}`, 'content-type': 'application/json' };
  }

  let base = await start();
  let headers = await login(base);
  const flow = await json(base, '/api/v1/flow/workflows', { method: 'POST', headers, body: JSON.stringify({ name: 'Recoverable review intent' }) });
  assert.equal(flow.response.status, 201);
  const committed = await json(base, `/api/v1/flow/workflows/${flow.body.id}/request-review`, { method: 'POST', headers });
  assert.equal(committed.response.status, 200);
  await app.close();
  closed = true;

  const idempotencyPath = path.join(dataDir, 'idempotency.json');
  const records = JSON.parse(fs.readFileSync(idempotencyPath, 'utf8')) as Array<{ key: string }>;
  fs.writeFileSync(idempotencyPath, JSON.stringify(records.filter((record) => !record.key.includes(`FLOW_REVIEW:${flow.body.id}:`)), null, 2));

  app = await buildApp({ dataDir, persistenceDriver: 'file' });
  closed = false;
  base = await start();
  headers = await login(base);
  const recovered = await json(base, `/api/v1/flow/workflows/${flow.body.id}/request-review`, { method: 'POST', headers });
  assert.equal(recovered.response.status, 200);
  assert.equal(recovered.body.workflow.status, 'REVIEW_REQUIRED');
  assert.equal(recovered.body.review.reviewId, committed.body.review.reviewId);
  assert.equal(recovered.body.witness.hash, committed.body.witness.hash);
  const reviews = await json(base, '/api/v1/reviews', { headers });
  assert.equal(reviews.body.reviews.filter((item: any) => item.payload?.targetId === flow.body.id).length, 1);
});
