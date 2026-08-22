// @ts-nocheck
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WitnessDag } from '../src/ledger/witness-dag.js';
import { appendMizanWitness } from '../src/ledger/witness-mizan.js';
import { LocalWitnessDagStore } from '../src/ledger/local-dag-store.js';
import { SingleNodeWitnessKeyStore } from '../src/ledger/single-node-keystore.js';
import { LocalCheckpointStore } from '../src/ledger/local-checkpoint-store.js';
import { signCheckpoint, verifySignedCheckpoint } from '../src/ledger/distributed-witness.js';
import { WitnessBackupManager } from '../src/ledger/witness-backup.js';
import { runWitnessDiagnostics } from '../src/ledger/witness-diagnostics.js';

const dir=await mkdtemp(path.join(os.tmpdir(),'mw-witness-419-'));
const restored=await mkdtemp(path.join(os.tmpdir(),'mw-witness-419-restore-'));
try {
  const password='single-node-419-test-password-with-entropy';
  const witnessId='LOCAL-COMPLETE-1';
  const keyStore=await SingleNodeWitnessKeyStore.open({filePath:path.join(dir,'witness','keystore.json.enc'),witnessId,password});
  const dag=new WitnessDag();
  const dagStore=await LocalWitnessDagStore.open(path.join(dir,'witness','qdag.json'));
  await dagStore.hydrate(dag);

  const rawText='private raw observation must never enter qdag';
  const node=appendMizanWitness(dag,{recordId:'CASE-1:v1',recordType:'ANALYSIS',actorId:'TEST',text:rawText,mizan:{score:7},semantic:{R:1,G:2,B:3,L:4},lifecycle:{stage:'ANALYZED'},modelVersion:'4.19.0'});
  assert.equal(JSON.stringify(node).includes(rawText),false);
  await dagStore.save(dag);
  const root=dag.root(); assert.ok(root);

  const reopenedDag=new WitnessDag();
  const reopenedStore=await LocalWitnessDagStore.open(path.join(dir,'witness','qdag.json'));
  const hydrate=await reopenedStore.hydrate(reopenedDag);
  assert.equal(hydrate.loaded,1); assert.equal(reopenedDag.root(),root); assert.equal(reopenedDag.getById('MIZAN_ANALYSIS_CASE-1:v1')?.hash,node.hash);

  const checkpointStore=await LocalCheckpointStore.open(path.join(dir,'witness','checkpoints.json'));
  const signed=signCheckpoint(reopenedDag.checkpoint('2026-08-22T03:00:00.000Z'),keyStore.activeIdentity()!);
  await checkpointStore.put(signed); assert.equal(verifySignedCheckpoint(signed,keyStore.activeRecord()!.publicKey),true);

  const backups=new WitnessBackupManager({dataDir:dir,dag:reopenedDag,witnessId});
  const backup=await backups.create('2026-08-22T03:01:00.000Z');
  const verified=await backups.verify(backup.directory); assert.equal(verified.valid,true); assert.equal(verified.manifest.qdagRoot,root);
  const manifestText=await readFile(path.join(backup.directory,'manifest.json'),'utf8'); assert.equal(manifestText.includes(password),false);

  const diagnostics=await runWitnessDiagnostics({dataDir:dir,dag:reopenedDag,keyStore,checkpoints:checkpointStore,backups});
  assert.equal(diagnostics.state,'HEALTHY');

  const restoreManager=new WitnessBackupManager({dataDir:restored,dag:new WitnessDag(),witnessId});
  await restoreManager.restore(backup.directory);
  const restoredKey=await SingleNodeWitnessKeyStore.open({filePath:path.join(restored,'witness','keystore.json.enc'),witnessId,password,createIfMissing:false});
  assert.equal(restoredKey.activeRecord()?.keyId,keyStore.activeRecord()?.keyId);
  const restoredDag=new WitnessDag(); const restoredDagStore=await LocalWitnessDagStore.open(path.join(restored,'witness','qdag.json')); await restoredDagStore.hydrate(restoredDag);
  assert.equal(restoredDag.root(),root); assert.equal(restoredDag.verify().valid,true);
  const restoredCheckpoints=await LocalCheckpointStore.open(path.join(restored,'witness','checkpoints.json'));
  assert.equal(restoredCheckpoints.list().length,1);
  assert.equal(verifySignedCheckpoint(restoredCheckpoints.latest()!,restoredKey.activeRecord()!.publicKey),true);

  console.log(JSON.stringify({ok:true,version:'4.19.0',singleNodeComplete:true,qdagRestartPersistence:true,mizanHashCommitment:true,rawTextExcluded:true,backupVerified:true,recoveryDrill:true,diagnostics:diagnostics.state,root},null,2));
} finally { await rm(dir,{recursive:true,force:true}); await rm(restored,{recursive:true,force:true}); }
