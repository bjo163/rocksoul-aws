import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EntityRepository } from '../../packages/persistence/src/types.js';

type JsonValue = any;

let initialized = false;
let postgresMode = false;
let revision = 0;
let datasets = new Map<string, JsonValue>();

// The process working directory varies between source, built, package, and
// workspace test execution. Resolve the data bundled beside this module as a
// deterministic fallback when the caller did not initialize a database-backed
// runtime snapshot.
const moduleDataRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const REQUIRED_RUNTIME_DATASETS = [
  'data/ai/concept-aliases.json',
  'data/registries/action-semantics.json',
  'data/semantic/registry.json',
  'data/mizan/quranic-principles.json',
  'data/justice/rules.json',
  'data/justice/sources-2026.json',
  'data/fiscal/rules.json',
  'data/fiscal/nisab-2026-id.json',
  'data/governance/constitutional-template.json',
  'data/revelation/quran-story-patterns.json',
  'data/backend/rules.json',
  'data/kernel/type-catalog.json',
  'data/divine-books/quran/ayahs.jsonl',
  'data/divine-books/witness-corpora/tawrat.jsonl',
  'data/divine-books/witness-corpora/zabur.jsonl',
  'data/divine-books/witness-corpora/injil.jsonl',
  'data/divine-books/revelation-corpus-manifest.json',
  'data/revelation/source-policy.json',
  'data/revelation/corpus-status.json',
  'data/revelation/geography-hypotheses.json',
  'data/revelation/language-concept-anchors.json',
  'data/revelation/scoring-profile.json',
  'data/events/event-language-profile.json',
  'data/events/moral-lifecycle-language-profile.json',
  'data/revelation/lifecycle-query-profile.json',
  'data/revelation/grammar-profile.json',
  'data/revelation/divine-ontology-profile.json'
] as const;

function normalizePath(p: string): string {
  return p.replaceAll('\\', '/').replace(/^\.\//, '');
}

function snapshotToData(payload: any): any {
  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data;
  if (payload && typeof payload === 'object' && 'rawText' in payload) {
    try { return JSON.parse(String(payload.rawText)); } catch { return payload.rawText; }
  }
  return payload;
}

export async function initializeRuntimeData(repo: EntityRepository, options: { postgres?: boolean } = {}): Promise<void> {
  const rows = await repo.list();
  const next = new Map<string, JsonValue>();
  for (const row of rows) {
    const payload = row.payload as any;
    const seed = payload?._seed;
    if (!seed?.path) continue;
    const key = normalizePath(String(seed.path));
    if (row.type === 'DATASET_SNAPSHOT') {
      next.set(key, snapshotToData(payload));
      continue;
    }
    const cleanPayload = { ...payload };
    delete cleanPayload._seed;
    const current = next.get(key);
    if (current === undefined) next.set(key, cleanPayload);
    else if (Array.isArray(current)) next.set(key, [...current, cleanPayload]);
    else next.set(key, [current, cleanPayload]);
  }
  datasets = next;
  postgresMode = options.postgres === true;
  revision += 1;
  initialized = true;
}

export function runtimeDataReady(): boolean { return initialized; }
export function runtimeDataRevision(): number { return revision; }

export function runtimeDataset(relativePath: string): JsonValue {
  const key = normalizePath(relativePath);
  if (initialized) {
    const value = datasets.get(key);
    if (value !== undefined) return value;
    if (postgresMode) throw new Error(`RUNTIME_DATA_NOT_SEEDED:${key}`);
  }
  if (postgresMode) throw new Error(`RUNTIME_DATA_NOT_INITIALIZED:${key}`);
  const candidates = [path.resolve(process.cwd(), key), path.resolve(moduleDataRoot, key)];
  const full = candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0];
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

export function runtimeDatasetOr<T>(relativePath: string, fallback: T): JsonValue | T {
  try { return runtimeDataset(relativePath); } catch { return fallback; }
}

export function runtimeDatasetPaths(): string[] { return [...datasets.keys()].sort(); }
