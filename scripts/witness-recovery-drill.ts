import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WitnessDag } from '../src/ledger/witness-dag.js';
import { LocalWitnessDagStore } from '../src/ledger/local-dag-store.js';
import { WitnessBackupManager } from '../src/ledger/witness-backup.js';
import { SingleNodeWitnessKeyStore, resolveSingleNodeWitnessPassword } from '../src/ledger/single-node-keystore.js';
import { LocalCheckpointStore } from '../src/ledger/local-checkpoint-store.js';
import { verifySignedCheckpoint } from '../src/ledger/distributed-witness.js';

const dataDir=path.resolve(process.env.MOONWITNESS_DATA_DIR ?? '.data');
const witnessId=process.env.WITNESS_ID || 'SERVICE-WITNESS-001';
const password=await resolveSingleNodeWitnessPassword({dataDir,explicitPassword:process.env.WITNESS_KEY_PASSWORD,production:process.env.NODE_ENV==='production'});
const liveDag=new WitnessDag(); const liveStore=await LocalWitnessDagStore.open(path.join(dataDir,'witness','qdag.json')); await liveStore.hydrate(liveDag);
const manager=new WitnessBackupManager({dataDir,dag:liveDag,witnessId}); const backups=await manager.list();
if(!backups.length) throw new Error('WITNESS_BACKUP_NOT_FOUND');
const latest=backups[0]; const verified=await manager.verify(latest.directory); if(!verified.valid) throw new Error(`WITNESS_BACKUP_INVALID:${verified.failures.join(',')}`);
const temp=await mkdtemp(path.join(os.tmpdir(),'mw-witness-drill-'));
try {
  const restoreManager=new WitnessBackupManager({dataDir:temp,dag:new WitnessDag(),witnessId}); await restoreManager.restore(latest.directory);
  const keyStore=await SingleNodeWitnessKeyStore.open({filePath:path.join(temp,'witness','keystore.json.enc'),witnessId,password:password.password,createIfMissing:false});
  const dag=new WitnessDag(); const dagStore=await LocalWitnessDagStore.open(path.join(temp,'witness','qdag.json')); await dagStore.hydrate(dag);
  const checkpoints=await LocalCheckpointStore.open(path.join(temp,'witness','checkpoints.json'));
  const keys=keyStore.list(); const invalid=checkpoints.list().filter((signed)=>{const key=keys.find((k)=>k.publicKey===signed.publicKey&&k.witnessId===signed.witnessId); return !key || !verifySignedCheckpoint(signed,key.publicKey);});
  const rootMatches=dag.root()===verified.manifest.qdagRoot; if(!rootMatches || invalid.length) throw new Error('WITNESS_RECOVERY_DRILL_FAILED');
  console.log(JSON.stringify({ok:true,backupId:verified.manifest.backupId,root:dag.root(),nodeCount:dag.list().length,checkpointCount:checkpoints.list().length,invalidCheckpoints:invalid.length,keyHistory:keyStore.list().length,passwordSource:password.source,destructive:false},null,2));
} finally { await rm(temp,{recursive:true,force:true}); }
