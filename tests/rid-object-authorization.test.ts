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

test('RID-owned runtime records reject cross-RID reads and writes while preserving a human-only Flow gate', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-rid-object-'));
  const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json'), jwtSecret: 'moonwitness-development-secret-12345' });
  auth.createUser({ username: 'public-alpha', password: 'strong-password-alpha-1', rid: 'RID-ALPHA', roles: ['USER'] });
  auth.createUser({ username: 'public-beta', password: 'strong-password-beta-1', rid: 'RID-BETA', roles: ['USER'] });
  auth.createUser({ username: 'reviewer-one', password: 'strong-password-reviewer-1', rid: 'RID-REVIEWER-1', roles: ['REVIEWER'] });
  auth.createUser({ username: 'reviewer-two', password: 'strong-password-reviewer-2', rid: 'RID-REVIEWER-2', roles: ['REVIEWER'] });
  auth.createUser({ username: 'rid-admin', password: 'strong-password-admin-1', rid: 'RID-ADMIN', roles: ['ADMIN'] });
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
  const claimedRid = await request(base, '/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'rid-claim-attempt', password: 'strong-password-claim-1', rid: 'RID-ALPHA' }) });
  assert.equal(claimedRid.response.status, 400);
  assert.equal(claimedRid.body.error, 'RID_ASSIGNMENT_NOT_ALLOWED');
  const unboundRegistration = await request(base, '/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'unbound-public', password: 'strong-password-unbound-1' }) });
  assert.equal(unboundRegistration.response.status, 201);
  assert.equal(unboundRegistration.body.rid, null);
  const unbound = await login('unbound-public', 'strong-password-unbound-1');
  assert.equal((await request(base, '/api/v1/xrp/workspace', { headers: unbound })).response.status, 403);
  const admin = await login('rid-admin', 'strong-password-admin-1');
  const bound = await request(base, '/api/v1/auth/bind-rid', {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({ userId: unboundRegistration.body.userId, rid: 'RID-PUBLIC-BOUND' }),
  });
  assert.equal(bound.response.status, 200);
  assert.equal(bound.body.rid, 'RID-PUBLIC-BOUND');
  assert.equal((await request(base, '/api/v1/auth/me', { headers: unbound })).response.status, 401, 'RID binding must revoke stale identity sessions');
  const rebound = await login('unbound-public', 'strong-password-unbound-1');
  assert.equal((await request(base, '/api/v1/xrp/workspace', { headers: rebound })).response.status, 200);
  const bindingAudit = await request(base, `/api/v1/resource/RID-BINDING-${unboundRegistration.body.userId}/audit`, { headers: admin });
  assert.equal(bindingAudit.response.status, 200);
  assert.equal(bindingAudit.body.audit[0].after.payload.immutable, true);
  const alpha = await login('public-alpha', 'strong-password-alpha-1');
  const beta = await login('public-beta', 'strong-password-beta-1');
  const reviewerOne = await login('reviewer-one', 'strong-password-reviewer-1');
  const reviewerTwo = await login('reviewer-two', 'strong-password-reviewer-2');

  const caseHeaders = { ...alpha, 'idempotency-key': 'alpha-case-create-1' };
  const caseBody = JSON.stringify({ title: 'Alpha private case', description: 'private content' });
  const created = await request(base, '/api/v1/xrp/cases', { method: 'POST', headers: caseHeaders, body: caseBody });
  assert.equal(created.response.status, 201);
  const caseId = created.body.id;
  const replayedCreate = await request(base, '/api/v1/xrp/cases', { method: 'POST', headers: caseHeaders, body: caseBody });
  assert.equal(replayedCreate.response.status, 201);
  assert.equal(replayedCreate.body.id, caseId);
  assert.equal((await request(base, `/api/v1/resource/${caseId}`, { headers: alpha })).response.status, 200);
  assert.equal((await request(base, `/api/v1/resource/${caseId}`, { headers: beta })).response.status, 404);
  assert.equal((await request(base, `/api/v1/xrp/cases/${caseId}/evidence`, { method: 'POST', headers: beta, body: JSON.stringify({ note: 'forbidden' }) })).response.status, 404);
  assert.equal((await request(base, '/api/v1/analyze', { method: 'POST', headers: beta, body: JSON.stringify({ caseId, text: 'forbidden overwrite' }) })).response.status, 404);
  const evidenceHeaders = { ...alpha, 'idempotency-key': 'alpha-evidence-create-1' };
  const evidenceBody = JSON.stringify({ sourceType: 'DOCUMENT', reference: 'ALPHA-1', note: 'submitted but not self-verified' });
  const evidence = await request(base, `/api/v1/xrp/cases/${caseId}/evidence`, { method: 'POST', headers: evidenceHeaders, body: evidenceBody });
  assert.equal(evidence.response.status, 201);
  assert.equal(evidence.body.evidence.status, 'OBSERVED');
  const replayedEvidence = await request(base, `/api/v1/xrp/cases/${caseId}/evidence`, { method: 'POST', headers: evidenceHeaders, body: evidenceBody });
  assert.equal(replayedEvidence.body.evidence.id, evidence.body.evidence.id);
  const selfVerification = await request(base, `/api/v1/resource/${caseId}/evidence`, { method: 'POST', headers: alpha, body: JSON.stringify({ status: 'VERIFIED', payload: { note: 'must not self-verify' } }) });
  assert.equal(selfVerification.response.status, 403);
  const reviewRequest = await request(base, `/api/v1/xrp/cases/${caseId}/request-review`, { method: 'POST', headers: { ...alpha, 'idempotency-key': 'alpha-review-request-1' } });
  assert.equal(reviewRequest.response.status, 201);
  assert.equal((await request(base, `/api/v1/resource/${caseId}`, { headers: reviewerOne })).response.status, 200, 'an unassigned reviewer may inspect an actively queued target');
  const assigned = await request(base, `/api/v1/reviews/${reviewRequest.body.reviewId}/transition`, { method: 'POST', headers: reviewerOne, body: JSON.stringify({ status: 'ASSIGNED' }) });
  assert.equal(assigned.response.status, 200);
  assert.match(String(assigned.body.assigneeId), /^USR-/);
  assert.equal((await request(base, `/api/v1/resource/${caseId}`, { headers: reviewerTwo })).response.status, 404, 'another reviewer loses access after assignment');
  assert.equal((await request(base, `/api/v1/resource/${caseId}`, { headers: reviewerOne })).response.status, 200);
  const reviewerTwoQueue = await request(base, '/api/v1/reviews', { headers: reviewerTwo });
  assert.equal(reviewerTwoQueue.body.reviews.some((item: any) => item.id === reviewRequest.body.reviewId), false);

  const flow = await request(base, '/api/v1/flow/workflows', { method: 'POST', headers: alpha, body: JSON.stringify({ name: 'Alpha evidence intake' }) });
  assert.equal(flow.response.status, 201);
  assert.equal((await request(base, '/api/v1/flow/workflows', { headers: beta })).body.workflows.length, 0);
  assert.equal((await request(base, `/api/v1/flow/workflows/${flow.body.id}/request-review`, { method: 'POST', headers: beta })).response.status, 404);
  const [committed, concurrentReplay] = await Promise.all([
    request(base, `/api/v1/flow/workflows/${flow.body.id}/request-review`, { method: 'POST', headers: { ...alpha, 'idempotency-key': 'flow-review-a' } }),
    request(base, `/api/v1/flow/workflows/${flow.body.id}/request-review`, { method: 'POST', headers: { ...alpha, 'idempotency-key': 'flow-review-b' } }),
  ]);
  assert.equal(committed.response.status, 200);
  assert.equal(concurrentReplay.response.status, 200);
  assert.equal(committed.body.workflow.status, 'REVIEW_REQUIRED');
  assert.equal(committed.body.workflow.reviewGate.adverseActionBlocked, true);
  assert.equal(typeof committed.body.witness.hash, 'string');
  assert.equal(concurrentReplay.body.witness.hash, committed.body.witness.hash);
  assert.doesNotMatch(JSON.stringify(committed.body.witness), /Evidence attached|Verify provenance/);
  const laterReplay = await request(base, `/api/v1/flow/workflows/${flow.body.id}/request-review`, { method: 'POST', headers: alpha });
  assert.equal(laterReplay.response.status, 200);
  assert.equal(laterReplay.body.witness.hash, committed.body.witness.hash);
});
