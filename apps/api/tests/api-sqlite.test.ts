import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildApp } from '../src/app.js';
import { createPersistence } from '../../../packages/persistence/src/index.js';

test('API persists a case through SQLite migrations', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-api-sqlite-'));
  const sqliteFile = path.join(dataDir, 'universe.sqlite');
  const app = await buildApp({ dataDir, persistenceDriver: 'sqlite', sqliteFile });
  await app.start(0, '127.0.0.1');
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const observed = await fetch(`${base}/api/v1/observe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entityId: 'SQLITE-CASE', payload: { text: 'SQLite persistence test' } }) });
    assert.equal(observed.status, 200);
    const analyzed = await fetch(`${base}/api/v1/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caseId: 'SQLITE-CASE', text: 'SQLite persistence test' }) });
    assert.equal(analyzed.status, 200);
  } finally {
    await app.close();
  }
  const store = createPersistence({ driver: 'sqlite', sqliteFile });
  assert.equal((await store.entityRepository().get('SQLITE-CASE'))?.type, 'CASE');
  assert.equal((await store.eventStore().verifyChain()).valid, true);
  assert.equal((await store.auditStore().verify()).valid, true);
  await store.close();
  await fs.rm(dataDir, { recursive: true, force: true });
});
