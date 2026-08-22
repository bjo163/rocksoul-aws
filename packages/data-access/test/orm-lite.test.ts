import test from 'node:test';
import assert from 'node:assert/strict';
import { UniverseDataClient } from '../src/index.js';

test('internal ORM/data mapper tracks actor and audit metadata', async () => {
  const c = new UniverseDataClient(undefined, 'USR-ORM-1');
  await c.upsertEntity({ id: 'E1', type: 'TEST', payload: { ok: true } });
  await c.upsertEntity({ id: 'E1', type: 'TEST', version: 2, payload: { ok: false } });
  const entity = await c.entities().get('E1');
  assert.equal(entity?.createdBy, 'USR-ORM-1');
  assert.equal(entity?.updatedBy, 'USR-ORM-1');
  assert.equal(entity?.version, 2);
  const history = await c.auditHistory('E1');
  assert.equal(history.length, 2);
  assert.equal(history[1]?.operation, 'UPDATE');
  assert.equal(history[1]?.actorId, 'USR-ORM-1');
  assert.equal((await c.verifyAudit()).valid, true);
  c.close();
});
