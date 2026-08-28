import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildApp } from '../src/app.js';
import { createAuthService } from '../../../src/access/auth.js';

async function json(base: string, route: string, init: RequestInit = {}): Promise<{ response: Response; body: any }> {
  const response = await fetch(`${base}${route}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  return { response, body: await response.json() };
}

test('API E2E persists an authenticated case and verifies replay/audit', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-api-e2e-'));
  const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json') });
  auth.createUser({ username: 'admin-e2e', password: 'strong-password-123', roles: ['ADMIN'] });
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const login = await json(base, '/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin-e2e', password: 'strong-password-123' }) });
    assert.equal(login.response.status, 200);
    const token = login.body.token as string;
    assert.ok(token);
    const headers = { authorization: `Bearer ${token}` };

    const observed = await json(base, '/api/v1/observe', { method: 'POST', headers, body: JSON.stringify({ entityId: 'E2E-CASE', source: 'E2E', payload: { text: 'authenticated observation' } }) });
    assert.equal(observed.response.status, 200);
    assert.equal(observed.body.entityId, 'E2E-CASE');

    const analyzed = await json(base, '/api/v1/analyze', { method: 'POST', headers, body: JSON.stringify({ caseId: 'E2E-CASE', text: 'authenticated analysis' }) });
    assert.equal(analyzed.response.status, 200);
    assert.equal(analyzed.body.status, 'PERSISTED');

    const resource = await json(base, '/api/v1/resource/E2E-CASE', { headers });
    assert.equal(resource.response.status, 200);
    assert.equal(resource.body.entity.id, 'E2E-CASE');
    assert.ok(Array.isArray(resource.body.events));

    const replay = await json(base, '/api/v1/resource/E2E-CASE/replay', { headers });
    assert.equal(replay.response.status, 200);
    assert.equal(replay.body.ledger.valid, true);

    const audit = await json(base, '/api/v1/resource/E2E-CASE/audit', { headers });
    assert.equal(audit.response.status, 200);
    assert.equal(audit.body.integrity.valid, true);
    assert.ok(audit.body.audit.length >= 2);

    const command = await json(base, '/api/v1/command', { method: 'POST', headers: { ...headers, 'idempotency-key': 'e2e-command-1' }, body: JSON.stringify({ command: 'CREATE_ENTITY', payload: { id: 'E2E-ENTITY', type: 'E2E', payload: { ok: true } } }) });
    assert.equal(command.response.status, 201);
    const repeated = await json(base, '/api/v1/command', { method: 'POST', headers: { ...headers, 'idempotency-key': 'e2e-command-1' }, body: JSON.stringify({ command: 'CREATE_ENTITY', payload: { id: 'E2E-ENTITY', type: 'E2E', payload: { ok: true } } }) });
    assert.equal(repeated.response.status, 201);
    assert.equal(repeated.body.id, command.body.id);
  } finally {
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('API E2E enforces Validator guard on command endpoints', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-api-e2e-val-'));
  const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json') });
  auth.createUser({ username: 'admin-val', password: 'strong-password-123', roles: ['ADMIN', 'COMMAND'] });
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const login = await json(base, '/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin-val', password: 'strong-password-123' }) });
    const headers = { authorization: `Bearer ${login.body.token}` };

    const invalid = await json(base, '/api/v1/command', { method: 'POST', headers, body: JSON.stringify({ payload: { type: 'TEST' } }) });
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error, 'BAD_REQUEST');
    assert.match(invalid.body.message, /Expected string/);

    const valid = await json(base, '/api/v1/command', { method: 'POST', headers, body: JSON.stringify({ command: 'CREATE_ENTITY', payload: { type: 'TEST', payload: {} } }) });
    assert.equal(valid.response.status, 201);
  } finally {
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('API E2E serves Server-Sent Events (SSE) stream and Metrics', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-api-e2e-sse-'));
  const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json') });
  auth.createUser({ username: 'admin-sse', password: 'strong-password-123', roles: ['ADMIN', 'READ_AUDIT'] });
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const login = await json(base, '/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin-sse', password: 'strong-password-123' }) });
    const headers = { authorization: `Bearer ${login.body.token}` };
    const metrics = await json(base, '/api/v1/metrics', { headers });
    assert.equal(metrics.response.status, 200);
    assert.ok(metrics.body.memory);
    assert.ok(metrics.body.uptime > 0);
    assert.equal(metrics.body.onlineUsers, 1);

    const streamRes = await fetch(`${base}/api/v1/stream`, { headers });
    assert.equal(streamRes.status, 200);
    assert.equal(streamRes.headers.get('content-type'), 'text/event-stream');
    const reader = streamRes.body?.getReader();
    assert.ok(reader);
    const chunk = await reader.read();
    const text = new TextDecoder().decode(chunk.value);
    assert.match(text, /data: \{"status": "connected"\}/);
    reader.cancel();
  } finally {
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('API E2E handles entity pagination standard', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-api-e2e-page-'));
  const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json') });
  auth.createUser({ username: 'admin-page', password: 'strong-password-123', roles: ['ADMIN', 'COMMAND', 'READ_AUDIT'] });
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const login = await json(base, '/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin-page', password: 'strong-password-123' }) });
    const headers = { authorization: `Bearer ${login.body.token}` };
    for (let i = 0; i < 3; i++) {
      await json(base, '/api/v1/entities', { method: 'POST', headers, body: JSON.stringify({ type: 'PAGE_TEST', payload: {} }) });
    }
    const paged = await json(base, '/api/v1/entities?type=PAGE_TEST&offset=1&limit=1', { headers });
    assert.equal(paged.response.status, 200);
    assert.equal(paged.body.length, 1);
    assert.ok(paged.body[0].id || paged.body[0].entityId);
  } finally {
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
