import path from 'node:path';
import { LocalWitnessDagStore, WitnessBackupManager, WitnessDag } from '@moonwitness/witness';

const dataDir=path.resolve(process.env.MOONWITNESS_DATA_DIR ?? '.data');
const witnessId=process.env.WITNESS_ID || 'SERVICE-WITNESS-001';
const dag=new WitnessDag();
const store=await LocalWitnessDagStore.open(path.join(dataDir,'witness','qdag.json'));
await store.hydrate(dag);
const manager=new WitnessBackupManager({dataDir,dag,witnessId});
const result=await manager.create();
console.log(JSON.stringify({ok:true,backupId:result.manifest.backupId,directory:result.directory,root:result.manifest.qdagRoot,nodeCount:result.manifest.nodeCount,passwordIncluded:false},null,2));
