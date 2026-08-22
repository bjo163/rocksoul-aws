// @ts-nocheck
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WitnessDag } from '../src/ledger/witness-dag.js';
import { signCheckpoint, verifySignedCheckpoint } from '../src/ledger/distributed-witness.js';
import { SingleNodeWitnessKeyStore } from '../src/ledger/single-node-keystore.js';
import { LocalCheckpointStore } from '../src/ledger/local-checkpoint-store.js';

const dir=await mkdtemp(path.join(os.tmpdir(),'mw-witness-418-'));
try {
  const keyFile=path.join(dir,'witness','keystore.json.enc'); const checkpointFile=path.join(dir,'witness','checkpoints.json');
  const password='test-password-with-sufficient-entropy-418';
  const first=await SingleNodeWitnessKeyStore.open({filePath:keyFile,witnessId:'LOCAL-1',password});
  const key1=first.activeRecord(); assert.ok(key1); const identity1=first.activeIdentity(); assert.ok(identity1?.privateKey);
  const encryptedRaw=await readFile(keyFile,'utf8'); assert.equal(encryptedRaw.includes('PRIVATE KEY'),false); assert.equal(encryptedRaw.includes(identity1.privateKey),false);

  const reopened=await SingleNodeWitnessKeyStore.open({filePath:keyFile,witnessId:'LOCAL-1',password,createIfMissing:false});
  assert.equal(reopened.activeRecord()?.keyId,key1.keyId); assert.equal(reopened.activeIdentity()?.publicKey,identity1.publicKey);
  await assert.rejects(()=>SingleNodeWitnessKeyStore.open({filePath:keyFile,witnessId:'LOCAL-1',password:'wrong-password',createIfMissing:false}),/WITNESS_KEYSTORE_DECRYPT_FAILED/);

  const key2=await reopened.rotate('2026-08-22T02:00:00.000Z'); assert.equal(reopened.get(key1.keyId)?.status,'SUPERSEDED'); assert.equal(reopened.activeRecord()?.keyId,key2.keyId);
  const afterRotate=await SingleNodeWitnessKeyStore.open({filePath:keyFile,witnessId:'LOCAL-1',password,createIfMissing:false}); assert.equal(afterRotate.activeRecord()?.keyId,key2.keyId);

  const dag=new WitnessDag(); dag.append({nodeId:'GENESIS',kind:'GENESIS',payload:{v:1},parents:[],occurredAt:'2026-08-22T02:01:00.000Z',nonce:'g'});
  const signed=signCheckpoint(dag.checkpoint('2026-08-22T02:02:00.000Z'),afterRotate.activeIdentity()!); assert.equal(verifySignedCheckpoint(signed,key2.publicKey),true);
  const checkpoints=await LocalCheckpointStore.open(checkpointFile); await checkpoints.put(signed);
  const checkpoints2=await LocalCheckpointStore.open(checkpointFile); assert.equal(checkpoints2.list().length,1); assert.equal(checkpoints2.latest()?.signature,signed.signature);

  await afterRotate.revoke(key2.keyId,'2026-08-22T02:03:00.000Z'); assert.equal(afterRotate.activeIdentity(),null);
  const revokedReload=await SingleNodeWitnessKeyStore.open({filePath:keyFile,witnessId:'LOCAL-1',password,createIfMissing:false});
  assert.equal(revokedReload.activeIdentity(),null); assert.equal(revokedReload.get(key2.keyId)?.status,'REVOKED');
  const key3=await revokedReload.create('2026-08-22T02:04:00.000Z'); assert.equal(revokedReload.activeRecord()?.keyId,key3.keyId);

  console.log(JSON.stringify({ok:true,version:'4.18.0',persistentIdentity:true,encryptedAtRest:true,rotation:true,revocationPersists:true,manualRecovery:true,checkpointPersistence:true,keyHistory:revokedReload.list().length},null,2));
} finally { await rm(dir,{recursive:true,force:true}); }
