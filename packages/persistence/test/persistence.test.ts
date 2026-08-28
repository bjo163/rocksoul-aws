import assert from 'node:assert/strict';
import { canonicalJson, createPersistence, hashEvent, backupFileStore, restoreFileStore } from '../src/index.js';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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
  assert.equal(
    canonicalJson({ z: 1, nested: { beta: 2, alpha: 1 }, rows: [{ y: 2, x: 1 }] }),
    canonicalJson({ rows: [{ x: 1, y: 2 }], nested: { alpha: 1, beta: 2 }, z: 1 }),
  );

  await store.projectionStore().upsert({ projectionId: 'PROJ-TEST', entityId: 'RID-TEST', projectionType: 'CURRENT', payload: { status: 'ACTIVE' } });
  assert.equal((await store.projectionStore().get('RID-TEST', 'CURRENT'))?.payload.status, 'ACTIVE');
  await store.close();

  const root = await mkdtemp(join(tmpdir(), 'moonwitness-file-backup-'));
  const source = join(root, 'source');
  const backup = join(root, 'backup');
  const restore = join(root, 'restore');
  try {
    await mkdir(source);
    await writeFile(join(source, 'universe-store.json'), '{"version":1}');
    await backupFileStore(source, backup);
    await restoreFileStore(backup, restore);
    assert.equal(await readFile(join(restore, 'universe-store.json'), 'utf8'), '{"version":1}');
    await assert.rejects(() => restoreFileStore(backup, restore), /RESTORE_TARGET_NOT_EMPTY/);
    await assert.rejects(() => backupFileStore(source, join(source, 'backup')), /BACKUP_TARGET_MUST_NOT_BE_INSIDE_SOURCE/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  console.log('PASS: persistence interfaces + event ledger + projection tests');
}

await run();
