import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createPersistence } from '../packages/persistence/src/factory.js';
import { PostgresProvider } from '../packages/persistence/src/postgres.js';
import { getLatestSchemaVersion } from '../packages/persistence/src/schema.js';
import { seedDatabase } from '../packages/persistence/src/bootstrap.js';
import { verifySeedState } from '../packages/persistence/src/seed-verification.js';
import { loadDatabaseConfig } from '../src/config-loader.js';
import { initializeRuntimeData, runtimeDatasetPaths, REQUIRED_RUNTIME_DATASETS } from '../src/persistence/runtime-data.js';
import { verifyRevelationCorpusFiles, verifyRevelationSeedDatabase, buildRevelationDerivedIndexes, verifyRevelationDerivedIndexes } from '../src/revelation/corpus/revelation-seed.js';
import { runRevelationTenCaseSmoke } from '../src/revelation/verification/ten-case.js';
import { runMoralLifecycleSmoke } from '../src/events/verification/lifecycle-smoke.js';

function arg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const config = loadDatabaseConfig();
const postgres = {
  ...(config.storage?.postgres ?? {}),
  connectionString: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? undefined,
  host: process.env.PGHOST ?? config.storage?.postgres?.host ?? 'localhost',
  port: Number(process.env.PGPORT ?? config.storage?.postgres?.port ?? 5432),
  database: process.env.PGDATABASE ?? config.storage?.postgres?.database ?? 'postgres',
  user: process.env.PGUSER ?? config.storage?.postgres?.user ?? 'postgres',
  ...(process.env.PGPASSWORD ? { password: process.env.PGPASSWORD } : {})
};
const configuredDriver = arg('driver', process.env.STORAGE_DRIVER ?? config.storage?.driver ?? 'postgres');
if (configuredDriver !== 'postgres' && configuredDriver !== 'memory' && configuredDriver !== 'file') {
  throw new Error(`Unsupported STORAGE_DRIVER: ${configuredDriver}. Supported drivers: postgres, memory, file`);
}
const driver = configuredDriver as 'postgres' | 'memory' | 'file';
const root = process.cwd();
const fileDir = resolve(root, arg('dir', process.env.PERSISTENCE_DIR ?? './data/runtime')!);
if (driver === 'file') await mkdir(fileDir, { recursive: true });
const persistenceConfig = { driver, fileDir, postgres } as const;

// Ensure schema/provider readiness before seed.
console.log('Connecting to database and verifying schema...');
const store = createPersistence(persistenceConfig);
if (driver === 'postgres' && store instanceof PostgresProvider) await store.ready();
else await store.ready?.();
await store.close();

const seedEnabled=process.env.SEED!=='0';
if (seedEnabled) console.log('Seeding database with initial data (this may take a moment)...');
const seed = seedEnabled ? await seedDatabase(root, persistenceConfig) : { seeded: 0, sources: 0 };
console.log('Verifying revelation corpus files...');
const corpusFiles=verifyRevelationCorpusFiles(root);
if(!corpusFiles.ok) throw new Error('REVELATION_CORPUS_FILE_VERIFICATION_FAILED');

if (!seedEnabled) {
  console.log(JSON.stringify({ok:true,driver,schemaVersion:getLatestSchemaVersion(),...seed,revelation:{corpusFiles,seedVerification:'SKIPPED_SEED_DISABLED',derivedIndexes:'SKIPPED_SEED_DISABLED',smoke:'SKIPPED_SEED_DISABLED'}},null,2));
} else if (driver === 'memory') {
  // A memory provider is intentionally ephemeral between factory instances. Validate bundled
  // corpora and behavior, but do not pretend that a second in-memory instance can reconcile seed rows.
  const smoke=await runRevelationTenCaseSmoke(root);
  if(!smoke.ok) throw new Error('REVELATION_10_CASE_SMOKE_FAILED');
  const lifecycleSmoke=await runMoralLifecycleSmoke(root);
  if(!lifecycleSmoke.ok) throw new Error('MORAL_LIFECYCLE_10_CASE_SMOKE_FAILED');
  console.log(JSON.stringify({ok:true,driver,schemaVersion:getLatestSchemaVersion(),...seed,verification:'MEMORY_PROVIDER_EPHEMERAL',revelation:{corpusFiles,seedVerification:'EPHEMERAL_PROVIDER_NOT_REOPENED',derivedIndexes:'EPHEMERAL_PROVIDER_NOT_PERSISTED',smoke,lifecycleSmoke}},null,2));
} else {
  const verificationStore=createPersistence(persistenceConfig);
  try {
    await verificationStore.ready?.();
    const verification=await verifySeedState(root,verificationStore);
    console.log('Verifying revelation seed state...');
    const seedVerification=await verifyRevelationSeedDatabase(verificationStore.entityRepository(),root);
    if(!seedVerification.ok) throw new Error('REVELATION_TYPED_SEED_VERIFICATION_FAILED');
    console.log('Initializing runtime datasets...');
    await initializeRuntimeData(verificationStore.entityRepository(),{postgres:driver==='postgres'});
    const loaded=new Set(runtimeDatasetPaths());
    const runtimeMissing=REQUIRED_RUNTIME_DATASETS.filter(item=>!loaded.has(item));
    const runtimeVerification={ok:runtimeMissing.length===0,mode:driver==='postgres'?'POSTGRES_SINGLE_SOURCE_OF_TRUTH':'SEEDED_LOCAL_RUNTIME',required:REQUIRED_RUNTIME_DATASETS.length,loaded:loaded.size,missing:runtimeMissing};
    if(!runtimeVerification.ok) throw new Error('RUNTIME_DATA_VERIFICATION_FAILED');
    console.log('Building revelation derived indexes...');
    const indexBuild=await buildRevelationDerivedIndexes(verificationStore.entityRepository(),root);
    console.log('Verifying indexes...');
    const indexVerification=await verifyRevelationDerivedIndexes(verificationStore.entityRepository(),root);
    if(!indexVerification.ok) throw new Error('REVELATION_DERIVED_INDEX_VERIFICATION_FAILED');
    console.log('Running smoke tests...');
    const smoke=await runRevelationTenCaseSmoke(root);
    if(!smoke.ok) throw new Error('REVELATION_10_CASE_SMOKE_FAILED');
    const lifecycleSmoke=await runMoralLifecycleSmoke(root);
    if(!lifecycleSmoke.ok) throw new Error('MORAL_LIFECYCLE_10_CASE_SMOKE_FAILED');
    console.log('Installation complete.');
    console.log(JSON.stringify({ok:true,driver,schemaVersion:getLatestSchemaVersion(),...seed,verification,runtimeVerification,revelation:{corpusFiles,seedVerification,indexBuild,indexVerification,smoke,lifecycleSmoke}},null,2));
  } finally { await verificationStore.close(); }
}