import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { createPersistence } from './factory.js';
import { sha256Text } from './seed-catalog.js';
import type { PersistenceConfig, PersistenceStore } from './types.js';

export interface SeedSource {
  id: string;
  path: string;
  entityType: string;
  format?: 'json' | 'jsonl';
  mode?: 'collection' | 'single';
  enabled?: boolean;
  kind?: 'structured' | 'snapshot';
}

export interface SeedManifest {
  version: number;
  sources: SeedSource[];
}

export async function loadSeedManifest(rootDir: string): Promise<SeedManifest> {
  const text = await readFile(resolve(rootDir, 'data/seed/manifest.json'), 'utf8');
  return JSON.parse(text) as SeedManifest;
}

function stableEntityId(sourceId: string, entityType: string, index: number): string {
  return `${sourceId.toUpperCase()}::${entityType.toUpperCase()}::${String(index + 1).padStart(5, '0')}`;
}

function toSeedItems(source: SeedSource, raw: unknown): Array<{ id: string; type: string; version: number; payload: Record<string, unknown> }> {
  if (source.format === 'jsonl') {
    const lines = String(raw).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return lines.map((line, index) => ({ id: stableEntityId(source.id, source.entityType, index), type: source.entityType, version: 1, payload: JSON.parse(line) as Record<string, unknown> }));
  }
  if (source.mode === 'single') return [{ id: stableEntityId(source.id, source.entityType, 0), type: source.entityType, version: 1, payload: (raw ?? {}) as Record<string, unknown> }];
  const items = Array.isArray(raw) ? raw : [raw];
  return items.map((item, index) => {
    const value = (item ?? {}) as Record<string, unknown>;
    const id = value.id !== undefined && value.id !== null ? String(value.id) : stableEntityId(source.id, source.entityType, index);
    return { id, type: source.entityType, version: typeof value.version === 'number' ? value.version : 1, payload: value };
  });
}

const EXCLUDED_SEED_DIRS = new Set(['seed']);
const CANONICAL_TYPED_DATASETS: SeedSource[] = [
  { id: 'prophet-profiles', path: 'packages/revelation/data/prophets.json', entityType: 'REVELATION.PROPHET_PROFILE', format: 'json', mode: 'collection', kind: 'structured' },
  { id: 'prophet-scripture-references', path: 'packages/revelation/data/knowledge/prophet-scripture-index.json', entityType: 'KNOWLEDGE.SCRIPTURE_REFERENCE', format: 'json', mode: 'collection', kind: 'structured' },
  { id: 'prophetic-events', path: 'packages/revelation/data/knowledge/prophetic-events.json', entityType: 'KNOWLEDGE.PROPHETIC_EVENT', format: 'json', mode: 'collection', kind: 'structured' },
];
const LEGACY_CANONICAL_DATASET_PATHS = new Set([
  'data/prophets.json',
  'data/knowledge/prophet-scripture-index.json',
  'data/knowledge/prophetic-events.json',
]);

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}

async function discoverJsonFiles(rootDir: string, currentIds: Set<string>): Promise<SeedSource[]> {
  const dataRoot = resolve(rootDir, 'data');
  const discovered: SeedSource[] = [];
  const canonicalPaths = new Set([
    ...CANONICAL_TYPED_DATASETS.map((source) => source.path),
    ...LEGACY_CANONICAL_DATASET_PATHS,
  ]);
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (dir === dataRoot && EXCLUDED_SEED_DIRS.has(entry.name)) continue;
        if (entry.name === 'runtime' || entry.name === 'backups') continue;
        await walk(resolve(dir, entry.name));
        continue;
      }
      if (!entry.isFile() || !/\.(json|jsonl)$/i.test(entry.name)) continue;
      if (/\.schema\.json$/i.test(entry.name)) continue;
      const full = resolve(dir, entry.name);
      const rel = normalizePath(relative(rootDir, full));
      if (canonicalPaths.has(rel)) continue;
      const idBase = `snapshot:${rel}`;
      if (currentIds.has(idBase)) continue;
      discovered.push({ id: idBase, path: rel, entityType: 'DATASET_SNAPSHOT', format: rel.endsWith('.jsonl') ? 'jsonl' : 'json', mode: 'single', kind: 'snapshot' });
    }
  }
  await walk(dataRoot);
  return discovered.sort((a, b) => a.path.localeCompare(b.path));
}

function snapshotPayload(source: SeedSource, raw: string): Record<string, unknown> {
  if (source.format === 'jsonl') return { path: source.path, format: source.format, sha256: sha256Text(raw), rawText: raw };
  return { path: source.path, format: source.format ?? 'json', sha256: sha256Text(raw), data: JSON.parse(raw) };
}

export async function seedIntoPersistenceStore(rootDir: string, store: PersistenceStore, driver: PersistenceConfig['driver'] = store.driver): Promise<{ seeded: number; sources: number }> {
  const manifest = await loadSeedManifest(rootDir);
  const manifestSources = manifest.sources.filter((source) => !LEGACY_CANONICAL_DATASET_PATHS.has(normalizePath(source.path)));
  const manifestIds = new Set(manifestSources.map((source) => source.id));
  const manifestPaths = new Set(manifestSources.map((source) => normalizePath(source.path)));
  const canonical = CANONICAL_TYPED_DATASETS.filter((source) => !manifestIds.has(source.id) && !manifestPaths.has(source.path));
  const discovered = (await discoverJsonFiles(rootDir, new Set([...manifestIds, ...canonical.map((source) => source.id)]))).filter((source) => !manifestPaths.has(normalizePath(source.path)));
  const allSources = [...manifestSources, ...canonical, ...discovered];
  const repo = store.entityRepository();
  let seeded = 0;
  let sources = 0;
  const work = async (): Promise<void> => {
    for (const source of allSources) {
      if (source.enabled === false) continue;
      const fullPath = resolve(rootDir, source.path);
      const raw = await readFile(fullPath, 'utf8');
      const items = source.kind === 'snapshot'
        ? [{ id: stableEntityId(source.id, source.entityType, 0), type: source.entityType, version: 1, payload: snapshotPayload(source, raw) }]
        : toSeedItems(source, source.format === 'jsonl' ? raw : JSON.parse(raw));
      const sourceSha256 = sha256Text(raw);
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const value = item.payload;
        value._seed = { sourceId: source.id, path: source.path, format: source.format ?? 'json', index, sha256: sourceSha256, kind: source.kind ?? 'structured' };
        await repo.put({ id: item.id, type: item.type, version: item.version, createdBy: typeof value.createdBy === 'string' ? value.createdBy : 'PROCESS-SEED-001', updatedBy: typeof value.updatedBy === 'string' ? value.updatedBy : 'PROCESS-SEED-001', createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined, updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined, payload: value });
        seeded += 1;
      }
      sources += 1;
    }
  };
  if (driver !== 'postgres' && store.batch) await store.batch(work);
  else await work();
  return { seeded, sources };
}

export async function seedDatabase(rootDir: string, config: PersistenceConfig): Promise<{ seeded: number; sources: number }> {
  const store = createPersistence(config);
  try {
    await store.ready?.();
    return await seedIntoPersistenceStore(rootDir, store, config.driver);
  } finally {
    await store.close();
  }
}
