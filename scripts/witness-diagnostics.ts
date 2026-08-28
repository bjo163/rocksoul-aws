import path from 'node:path';
import {
  LocalCheckpointStore,
  LocalWitnessDagStore,
  runWitnessDiagnostics,
  SingleNodeWitnessKeyStore,
  resolveSingleNodeWitnessPassword,
  WitnessBackupManager,
  WitnessDag,
} from '@moonwitness/witness';

const dataDir=path.resolve(process.env.MOONWITNESS_DATA_DIR ?? '.data');
const witnessId=process.env.WITNESS_ID || 'SERVICE-WITNESS-001';
const password=await resolveSingleNodeWitnessPassword({dataDir,explicitPassword:process.env.WITNESS_KEY_PASSWORD,production:process.env.NODE_ENV==='production'});
const dag=new WitnessDag(); const dagStore=await LocalWitnessDagStore.open(path.join(dataDir,'witness','qdag.json')); await dagStore.hydrate(dag);
const keyStore=await SingleNodeWitnessKeyStore.open({filePath:path.join(dataDir,'witness','keystore.json.enc'),witnessId,password:password.password,createIfMissing:false});
const checkpoints=await LocalCheckpointStore.open(path.join(dataDir,'witness','checkpoints.json'));
const backups=new WitnessBackupManager({dataDir,dag,witnessId});
const result=await runWitnessDiagnostics({dataDir,dag,keyStore,checkpoints,backups});
console.log(JSON.stringify({...result,passwordSource:password.source},null,2));
if(result.state==='FAILED') process.exitCode=2;
