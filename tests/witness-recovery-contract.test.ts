import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WitnessDag } from '../src/ledger/witness-dag.js';
import { LocalWitnessDagStore } from '../src/ledger/local-dag-store.js';
import { WitnessBackupManager } from '../src/ledger/witness-backup.js';

test('Witness backup restore preserves DAG root and node count', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'mw-witness-contract-'));
  const restoreDir = await mkdtemp(path.join(os.tmpdir(), 'mw-witness-restore-'));
  try {
    const dag = new WitnessDag();
    dag.append({ kind: 'TEST_NODE', payload: { value: 1 }, actorId: 'TEST' });
    dag.append({ kind: 'TEST_NODE', payload: { value: 2 }, actorId: 'TEST' });
    const store = await LocalWitnessDagStore.open(path.join(dataDir, 'witness', 'qdag.json'));
    await store.save(dag);

    const manager = new WitnessBackupManager({ dataDir, dag, witnessId: 'TEST-WITNESS' });
    const created = await manager.create();
    const verified = await manager.verify(created.directory);
    assert.equal(verified.valid, true);

    const restoredManager = new WitnessBackupManager({ dataDir: restoreDir, dag: new WitnessDag(), witnessId: 'TEST-WITNESS' });
    await restoredManager.restore(created.directory);
    const restoredDag = new WitnessDag();
    const restoredStore = await LocalWitnessDagStore.open(path.join(restoreDir, 'witness', 'qdag.json'));
    await restoredStore.hydrate(restoredDag);

    assert.equal(restoredDag.root(), dag.root());
    assert.equal(restoredDag.list().length, dag.list().length);
    assert.equal(restoredDag.integrity().ok, true);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
    await rm(restoreDir, { recursive: true, force: true });
  }
});
