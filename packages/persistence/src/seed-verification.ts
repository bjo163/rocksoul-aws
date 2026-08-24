import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import type { PersistenceStore } from './types.js';
import { loadSeedManifest, type SeedSource } from './bootstrap.js';
import { sha256Text } from './seed-catalog.js';
import { getLatestSchemaVersion } from './schema.js';

export interface SeedVerificationSourceResult {
  sourceId: string;
  path: string;
  expectedItems: number;
  dbEntities: number;
  checksumMatches: boolean;
  countOk: boolean;
  status: 'VERIFIED' | 'FAILED';
}

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

async function discoverJsonFiles(rootDir: string, manifestIds: Set<string>, manifestPaths: Set<string>) {
  const out: Array<{ id: string; path: string; format: 'json' | 'jsonl' }> = [];
  const dataRoot = resolve(rootDir, 'data');
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (dir === dataRoot && entry.name === 'seed') continue;
        if (entry.name === 'runtime' || entry.name === 'backups') continue;
        await walk(resolve(dir, entry.name));
        continue;
      }
      if (!entry.isFile() || !/\.(json|jsonl)$/i.test(entry.name) || /\.schema\.json$/i.test(entry.name)) continue;
      const full = resolve(dir, entry.name);
      const path = relative(rootDir, full).replaceAll('\\', '/');
      const id = `snapshot:${path}`;
      if (manifestIds.has(id) || manifestPaths.has(path) || LEGACY_CANONICAL_DATASET_PATHS.has(path) || path === 'data/identity/actors.json') continue;
      out.push({ id, path, format: path.endsWith('.jsonl') ? 'jsonl' : 'json' });
    }
  }
  await walk(dataRoot);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export async function verifySeedState(rootDir: string, store: PersistenceStore, options: { assertOk?: boolean } = {}) {
  const manifest = await loadSeedManifest(rootDir);
  // These legacy Prophet sources remain in the manifest for historical compatibility, but are no longer canonical or seeded.
  const manifestSources = manifest.sources.filter((source) => !LEGACY_CANONICAL_DATASET_PATHS.has(source.path.replaceAll('\\', '/')));
  const manifestIds = new Set(manifestSources.map((s) => s.id));
  const manifestPaths = new Set(manifestSources.map((s) => s.path.replaceAll('\\', '/')));
  const canonical = CANONICAL_TYPED_DATASETS.filter((source) => !manifestIds.has(source.id) && !manifestPaths.has(source.path));
  const discovered = await discoverJsonFiles(rootDir, new Set([...manifestIds, ...canonical.map((source) => source.id)]), new Set([...manifestPaths, ...canonical.map((source) => source.path), ...LEGACY_CANONICAL_DATASET_PATHS]));
  const actorFallback = manifestIds.has('actors') ? [] : [{ id: 'actors', path: 'data/identity/actors.json', format: 'json' as const }];
  const sourcesById = new Map<string, SeedSource>();
  for (const source of [...manifestSources, ...canonical, ...discovered, ...actorFallback]) sourcesById.set(source.id, source as SeedSource);
  const sources = [...sourcesById.values()];
  const entities = await store.entityRepository().list();
  const bySource = new Map<string, typeof entities>();
  for (const entity of entities) {
    const meta = (entity.payload?._seed ?? {}) as Record<string, unknown>;
    const sourceId = typeof meta.sourceId === 'string' ? meta.sourceId : undefined;
    if (!sourceId) continue;
    const list = bySource.get(sourceId) ?? [];
    list.push(entity);
    bySource.set(sourceId, list);
  }

  const report: SeedVerificationSourceResult[] = [];
  for (const source of sources) {
    const raw = await readFile(resolve(rootDir, source.path));
    const text = raw.toString('utf8');
    const sha = sha256Text(text);
    let expectedItems = 1;
    if (source.format === 'jsonl') expectedItems = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
    else {
      const parsed = JSON.parse(text) as unknown;
      expectedItems = Array.isArray(parsed) ? parsed.length : 1;
    }
    const rows = bySource.get(source.id) ?? [];
    const checksumMatches = rows.length > 0 && rows.every((row) => ((row.payload?._seed ?? {}) as Record<string, unknown>).sha256 === sha);
    const countOk = source.id.startsWith('snapshot:') ? rows.length === 1 : rows.length === expectedItems;
    report.push({ sourceId: source.id, path: source.path, expectedItems, dbEntities: rows.length, checksumMatches, countOk, status: checksumMatches && countOk ? 'VERIFIED' : 'FAILED' });
  }

  const eventChain = await store.eventStore().verifyChain();
  const audit = await store.auditStore().verify();
  const failedSources = report.filter((row) => row.status === 'FAILED');
  const result = {
    ok: failedSources.length === 0 && eventChain.valid && audit.valid,
    schemaVersion: getLatestSchemaVersion(),
    entities: entities.length,
    sources: report.length,
    verifiedSources: report.length - failedSources.length,
    failedSources,
    eventChain,
    audit,
    report,
  };
  if (options.assertOk !== false) assert.equal(result.ok, true);
  return result;
}
