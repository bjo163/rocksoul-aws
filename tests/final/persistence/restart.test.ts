import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createPersistence } from '../../../packages/persistence/src/index.js';
import { backupFileStore, restoreFileStore } from '../../../packages/persistence/src/index.js';
import { IdempotencyStore } from '../../../src/persistence/idempotency.js';

test('file persistence survives restart and preserves event/audit integrity', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-persistence-restart-'));
  try {
    const first = createPersistence({ driver: 'file', fileDir: dir });
    await first.entityRepository().put({ id: 'RESTART-1', type: 'CASE', version: 1, payload: { status: 'OBSERVED' } });
    const event = await first.eventStore().append({ eventId: 'RESTART-E1', entityId: 'RESTART-1', eventType: 'OBSERVED', payload: { ok: true } });
    await first.close();

    const second = createPersistence({ driver: 'file', fileDir: dir });
    assert.deepEqual((await second.entityRepository().get('RESTART-1'))?.payload, { status: 'OBSERVED' });
    assert.equal((await second.eventStore().get(event.eventId))?.eventHash, event.eventHash);
    assert.equal((await second.eventStore().verifyChain()).valid, true);
    assert.equal((await second.auditStore().verify()).valid, true);

    assert.ok(second.batch);
    await assert.rejects(
      () => second.batch!(async () => {
        await second.entityRepository().put({ id: 'ROLLBACK-1', type: 'TEMP', version: 1, payload: { transient: true } });
        throw new Error('INTENTIONAL_ROLLBACK');
      }),
      /INTENTIONAL_ROLLBACK/,
    );
    assert.equal(await second.entityRepository().get('ROLLBACK-1'), null);
    await second.close();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('idempotency records survive restart and reject payload reuse', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-idempotency-restart-'));
  const file = path.join(dir, 'idempotency.json');
  try {
    const first = new IdempotencyStore(file);
    const original = await first.execute('KEY-1', IdempotencyStore.hash({ value: 1 }), async () => ({ statusCode: 201, body: { id: 'PERSISTED-1' } }));
    assert.equal(original.statusCode, 201);

    const second = new IdempotencyStore(file);
    const replay = await second.execute('KEY-1', IdempotencyStore.hash({ value: 1 }), async () => ({ statusCode: 500, body: { unexpected: true } }));
    assert.deepEqual(replay, original);
    await assert.rejects(() => second.execute('KEY-1', IdempotencyStore.hash({ value: 2 }), async () => ({ statusCode: 201, body: {} })), /IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('file store backup restores with checksum verification', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-backup-'));
  const source = path.join(root, 'source');
  const backup = path.join(root, 'backup');
  const restored = path.join(root, 'restored');
  try {
    const store = createPersistence({ driver: 'file', fileDir: source });
    await store.entityRepository().put({ id: 'BACKUP-1', type: 'CASE', version: 1, payload: { durable: true } });
    await store.eventStore().append({ eventId: 'BACKUP-E1', entityId: 'BACKUP-1', eventType: 'TEST', payload: { value: 7 } });
    await store.close();

    const manifest = await backupFileStore(source, backup);
    assert.equal(manifest.files.length, 1);
    await restoreFileStore(backup, restored);
    const recovered = createPersistence({ driver: 'file', fileDir: restored });
    assert.deepEqual((await recovered.entityRepository().get('BACKUP-1'))?.payload, { durable: true });
    assert.equal((await recovered.eventStore().verifyChain()).valid, true);
    await recovered.close();
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
