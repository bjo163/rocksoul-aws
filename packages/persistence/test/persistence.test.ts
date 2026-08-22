import assert from 'node:assert/strict';
import { createPersistence, hashEvent } from '../src/index.js';

async function run(): Promise<void> {
  const store = createPersistence({ driver: 'memory' });
  const entities = store.entityRepository();
  await entities.put({ id: 'RID-TEST', type: 'PERSON', version: 1, payload: { name: 'Test' } });
  assert.equal((await entities.get('RID-TEST'))?.payload.name, 'Test');

  await store.relationRepository().put({ id: 'REL-TEST', fromId: 'RID-TEST', type: 'KNOWS', toId: 'ENTITY-2' });
  assert.equal((await store.relationRepository().listByEntity('RID-TEST')).length, 1);

  const events = store.eventStore();
  const first = await events.append({ eventId: 'EVT-TEST-1', entityId: 'RID-TEST', eventType: 'TEST', payload: { x: 1 } });
  const second = await events.append({ eventId: 'EVT-TEST-2', entityId: 'RID-TEST', eventType: 'TEST', payload: { x: 2 } });
  assert.equal(second.previousHash, first.eventHash);
  assert.equal(hashEvent(second, second.previousHash), second.eventHash);
  assert.deepEqual(await events.verifyChain(), { valid: true, events: 2, head: second.eventHash });

  await store.projectionStore().upsert({ projectionId: 'PROJ-TEST', entityId: 'RID-TEST', projectionType: 'CURRENT', payload: { status: 'ACTIVE' } });
  assert.equal((await store.projectionStore().get('RID-TEST', 'CURRENT'))?.payload.status, 'ACTIVE');
  await store.close();
  console.log('PASS: persistence interfaces + event ledger + projection tests');
}

await run();
