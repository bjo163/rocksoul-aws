import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadSeedManifest } from '../packages/persistence/src/bootstrap.js';
import { getLatestSchemaVersion } from '../packages/persistence/src/schema.js';
import { REQUIRED_RUNTIME_DATASETS } from '../src/persistence/runtime-data.js';
import { describeSeedFile } from '../packages/persistence/src/seed-catalog.js';
import { verifyRevelationCorpusFiles } from '../src/revelation/corpus/revelation-seed.js';

const root = process.cwd();
const manifest = await loadSeedManifest(root);
const LEGACY_CANONICAL_DATASET_PATHS = new Set([
  'data/prophets.json',
  'data/knowledge/prophet-scripture-index.json',
  'data/knowledge/prophetic-events.json',
]);
const manifestSources = manifest.sources.filter((source) => !LEGACY_CANONICAL_DATASET_PATHS.has(source.path.replaceAll('\\', '/')));
const ids = new Set<string>();
const paths = new Set<string>();
const errors: string[] = [];
const warnings: string[] = [];
let expectedItems = 0;

for (const source of manifestSources) {
  if (ids.has(source.id)) errors.push(`DUPLICATE_SOURCE_ID:${source.id}`);
  ids.add(source.id);
  if (paths.has(source.path)) errors.push(`DUPLICATE_SOURCE_PATH:${source.path}`);
  paths.add(source.path);
  try {
    const catalog = await describeSeedFile(root, source);
    expectedItems += source.kind === 'snapshot' ? 1 : catalog.expectedItems;
  } catch (error) {
    errors.push(`MISSING_OR_INVALID_SOURCE:${source.path}:${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const required of REQUIRED_RUNTIME_DATASETS) {
  if (!paths.has(required)) errors.push(`RUNTIME_DATASET_NOT_IN_MANIFEST:${required}`);
}

const revelationCorpus = verifyRevelationCorpusFiles(root);
if (!revelationCorpus.ok) errors.push('REVELATION_CORPUS_MANIFEST_VERIFICATION_FAILED');

const envSecret = process.env.JWT_SECRET ?? '';
if (process.env.NODE_ENV === 'production' && (!envSecret || envSecret.length < 32)) {
  errors.push('JWT_SECRET_MUST_BE_32_CHARS_IN_PRODUCTION');
}
if (process.env.STORAGE_DRIVER === 'postgres' && !process.env.PGPASSWORD && !process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  warnings.push('POSTGRES_PASSWORD_NOT_SET_IN_ENV: config file or external credential provider must supply it');
}
if (process.env.STORAGE_DRIVER === 'postgres') {
  // pg_dump/pg_restore are checked by the operational scripts; preflight remains source/runtime focused.
}

const sourceText = async (relativePath: string): Promise<string> => {
  const tsPath = resolve(root, relativePath);
  try { return await readFile(tsPath, 'utf8'); } catch {
    const jsPath = resolve(root, relativePath.replace(/\.ts$/, '.js'));
    return await readFile(jsPath, 'utf8');
  }
};
const appSource = await sourceText('apps/api/src/app.ts');
const backendRuntimeSource = await sourceText('src/backend/kernel/backend-runtime.ts');
const backendBootstrapSource = await sourceText('src/backend/bootstrap.ts');
if (!appSource.includes('PostgresAuthService.create')) errors.push('POSTGRES_AUTH_SELECTION_MISSING');
if (!appSource.includes('new PostgresIdempotencyStore')) errors.push('POSTGRES_IDEMPOTENCY_SELECTION_MISSING');
if (!appSource.includes('initializeRuntimeData(universeStore.persistence.entities()')) errors.push('RUNTIME_DATA_POSTGRES_INITIALIZATION_MISSING');
if (process.env.STORAGE_DRIVER === 'postgres') {
  if (!backendBootstrapSource.includes('PostgresBackendRuntime')) errors.push('POSTGRES_BACKEND_RUNTIME_SELECTION_MISSING');
} else if (/stateFile|ledgerFile/.test(backendRuntimeSource)) {
  warnings.push('LEGACY_BACKEND_USES_FILE_STATE_IN_NON_POSTGRES_MODE');
}

const result = {
  ok: errors.length === 0,
  schemaVersion: getLatestSchemaVersion(),
  manifestSources: manifestSources.length,
  expectedSeedEntities: expectedItems,
  requiredRuntimeDatasets: REQUIRED_RUNTIME_DATASETS.length,
  revelationCorpus: { ok: revelationCorpus.ok, totalExpected: revelationCorpus.totalExpected, totalActual: revelationCorpus.totalActual, fingerprint: revelationCorpus.fingerprint },
  errors,
  warnings,
  mode: process.env.STORAGE_DRIVER ?? 'not-set'
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(2);
