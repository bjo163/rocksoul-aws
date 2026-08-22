import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from '../apps/api/src/app.js';
import { createAuthService } from '../src/access/auth.js';

async function request(base: string, route: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${route}`, init);
  return { response, body: await response.json() as any };
}

test('XRP workspace is server-scoped by RID and returns sanitized live projections', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-xrp-rid-'));
  const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json'), jwtSecret: 'moonwitness-development-secret-12345' });
  auth.createUser({ username: 'rid-alpha-one', password: 'strong-password-alpha-1', rid: 'RID-ALPHA', roles: ['ADMIN'] });
  auth.createUser({ username: 'rid-alpha-two', password: 'strong-password-alpha-2', rid: 'RID-ALPHA', roles: ['ADMIN'] });
  auth.createUser({ username: 'rid-beta', password: 'strong-password-beta-1', rid: 'RID-BETA', roles: ['ADMIN'] });
  auth.createUser({ username: 'no-rid', password: 'strong-password-no-rid', roles: ['ADMIN'] });
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('API_TEST_ADDRESS_NOT_AVAILABLE');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => { await app.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

  async function login(username: string, password: string) {
    const result = await request(base, '/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-mw-auth-mode': 'bearer' }, body: JSON.stringify({ username, password }) });
    assert.equal(result.response.status, 200);
    return { authorization: `Bearer ${result.body.accessToken}`, 'content-type': 'application/json' };
  }
  const alpha = await login('rid-alpha-one', 'strong-password-alpha-1');
  const alphaPeer = await login('rid-alpha-two', 'strong-password-alpha-2');
  const beta = await login('rid-beta', 'strong-password-beta-1');
  const noRid = await login('no-rid', 'strong-password-no-rid');

  const alphaCase = await request(base, '/api/v1/observe', { method: 'POST', headers: alpha, body: JSON.stringify({ entityId: 'CASE-ALPHA', source: 'XRP', payload: { title: 'Alpha private case', secret: 'must-not-leak' } }) });
  assert.equal(alphaCase.response.status, 200);
  const betaCase = await request(base, '/api/v1/observe', { method: 'POST', headers: beta, body: JSON.stringify({ entityId: 'CASE-BETA', source: 'XRP', payload: { title: 'Beta private case' } }) });
  assert.equal(betaCase.response.status, 200);
  const task = await request(base, '/api/v1/command', { method: 'POST', headers: { ...alpha, 'idempotency-key': 'xrp-rid-task-1' }, body: JSON.stringify({ command: 'CREATE_ENTITY', target: 'TASK-ALPHA', payload: { type: 'TASK', payload: { title: 'Alpha due task', status: 'OPEN', dueAt: new Date(Date.now() + 86_400_000).toISOString(), ownerRid: 'RID-BETA' } } }) });
  assert.equal(task.response.status, 201);
  const evidence = await request(base, '/api/v1/resource/CASE-ALPHA/evidence', { method: 'POST', headers: alpha, body: JSON.stringify({ sourceType: 'DOCUMENT', reference: 'DOC-ALPHA', status: 'VERIFIED', confidence: 0.91, payload: { secretEvidenceBody: 'must-not-leak' } }) });
  assert.equal(evidence.response.status, 200);
  const review = await request(base, '/api/v1/reviews', { method: 'POST', headers: alpha, body: JSON.stringify({ targetId: 'CASE-ALPHA', gateDecision: 'REQUIRE_HUMAN_REVIEW' }) });
  assert.equal(review.response.status, 201);
  const transitioned = await request(base, `/api/v1/reviews/${review.body.reviewId}/transition`, { method: 'POST', headers: alpha, body: JSON.stringify({ status: 'ACKNOWLEDGED', rationale: 'internal reviewer note' }) });
  assert.equal(transitioned.response.status, 200);

  const own = await request(base, '/api/v1/xrp/workspace', { headers: alpha });
  assert.equal(own.response.status, 200);
  assert.equal(own.body.protocol, 'MW_XRP_WORKSPACE_V1');
  assert.equal(own.body.rid, 'RID-ALPHA');
  assert.deepEqual(own.body.cases.map((item: any) => item.id), ['CASE-ALPHA']);
  assert.deepEqual(own.body.workItems.map((item: any) => item.id), ['TASK-ALPHA']);
  assert.equal(own.body.summary.verifiedEvidence, 1);
  assert.equal(own.body.summary.awaitingReview, 1);
  assert.equal(own.body.summary.dueTasks, 1);
  const serialized = JSON.stringify(own.body);
  assert.doesNotMatch(serialized, /must-not-leak|internal reviewer note|secretEvidenceBody/);

  const peer = await request(base, '/api/v1/xrp/workspace', { headers: alphaPeer });
  assert.deepEqual(peer.body.cases.map((item: any) => item.id), ['CASE-ALPHA'], 'accounts sharing an explicit RID share its workspace');
  const isolated = await request(base, '/api/v1/xrp/workspace', { headers: beta });
  assert.deepEqual(isolated.body.cases.map((item: any) => item.id), ['CASE-BETA']);
  assert.deepEqual(isolated.body.workItems, [], 'client-supplied ownerRid cannot move an entity across RID boundaries');
  const rejected = await request(base, '/api/v1/xrp/workspace', { headers: noRid });
  assert.equal(rejected.response.status, 403);
  assert.equal(rejected.body.error, 'RID_REQUIRED');
});
