import { createPersistence } from '../packages/persistence/src/factory.js';
import { initializeRuntimeData, runtimeDatasetPaths, REQUIRED_RUNTIME_DATASETS } from '../src/persistence/runtime-data.js';
import { loadDatabaseConfig } from '../src/config-loader.js';

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

const required = [...REQUIRED_RUNTIME_DATASETS];

const store = createPersistence({ driver: 'postgres', postgres });
try {
  await store.ready?.();
  await initializeRuntimeData(store.entityRepository(), { postgres: true });
  const paths = new Set(runtimeDatasetPaths());
  const missing = required.filter((path) => !paths.has(path));
  const result = {
    ok: missing.length === 0,
    runtimeDataMode: 'POSTGRES_SINGLE_SOURCE_OF_TRUTH',
    loadedDatasets: paths.size,
    requiredDatasets: required.length,
    missing,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 2;
} finally {
  await store.close();
}
