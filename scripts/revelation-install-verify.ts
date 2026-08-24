import { createPersistence } from '../packages/persistence/src/factory.js';
import { loadDatabaseConfig } from '../src/config-loader.js';
import { initializeRuntimeData } from '../src/persistence/runtime-data.js';
import { verifyRevelationCorpusFiles, verifyRevelationSeedDatabase, buildRevelationDerivedIndexes, verifyRevelationDerivedIndexes } from '../src/revelation/corpus/revelation-seed.js';
import { runRevelationTenCaseSmoke } from '../src/revelation/verification/ten-case.js';
import { runMoralLifecycleSmoke } from '../src/events/verification/lifecycle-smoke.js';

function arg(name:string,fallback?:string){ const prefix=`--${name}=`; const hit=process.argv.find(x=>x.startsWith(prefix)); return hit?hit.slice(prefix.length):fallback; }
const config=loadDatabaseConfig();
const configuredDriver=arg('driver',process.env.STORAGE_DRIVER??config.storage?.driver??'postgres');
if (configuredDriver !== 'postgres' && configuredDriver !== 'file' && configuredDriver !== 'memory') {
  throw new Error(`Unsupported STORAGE_DRIVER: ${configuredDriver}. Supported drivers: postgres, file, memory`);
}
const driver=configuredDriver as 'postgres'|'file'|'memory';
const postgres={...(config.storage?.postgres??{}),connectionString:process.env.DATABASE_URL??process.env.POSTGRES_URL??undefined,host:process.env.PGHOST??config.storage?.postgres?.host??'localhost',port:Number(process.env.PGPORT??config.storage?.postgres?.port??5432),database:process.env.PGDATABASE??config.storage?.postgres?.database??'postgres',user:process.env.PGUSER??config.storage?.postgres?.user??'postgres',...(process.env.PGPASSWORD?{password:process.env.PGPASSWORD}:{})};
const store=createPersistence({driver,postgres,fileDir:process.env.PERSISTENCE_DIR});
try {
  await store.ready?.();
  const fileVerification=verifyRevelationCorpusFiles(process.cwd());
  if(!fileVerification.ok) throw new Error('REVELATION_CORPUS_FILE_VERIFICATION_FAILED');
  const seedVerification=await verifyRevelationSeedDatabase(store.entityRepository(),process.cwd());
  if(!seedVerification.ok) throw new Error('REVELATION_TYPED_SEED_VERIFICATION_FAILED');
  await initializeRuntimeData(store.entityRepository(),{postgres:driver==='postgres'});
  const indexBuild=await buildRevelationDerivedIndexes(store.entityRepository(),process.cwd());
  const indexVerification=await verifyRevelationDerivedIndexes(store.entityRepository(),process.cwd());
  if(!indexVerification.ok) throw new Error('REVELATION_DERIVED_INDEX_VERIFICATION_FAILED');
  const smoke=await runRevelationTenCaseSmoke(process.cwd());
  if(!smoke.ok) throw new Error('REVELATION_10_CASE_SMOKE_FAILED');
  const lifecycleSmoke=await runMoralLifecycleSmoke(process.cwd());
  if(!lifecycleSmoke.ok) throw new Error('MORAL_LIFECYCLE_10_CASE_SMOKE_FAILED');
  console.log(JSON.stringify({ok:true,driver,fileVerification,seedVerification,indexBuild,indexVerification,smoke,lifecycleSmoke},null,2));
} finally { await store.close(); }
