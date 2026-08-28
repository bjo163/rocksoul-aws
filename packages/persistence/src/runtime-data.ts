import fs from 'node:fs';
import path from 'node:path';
import type { EntityRepository } from './types.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type RuntimeSnapshot = Record<string, JsonValue>;

let initialized = false;
let postgresMode = false;
let revision = 0;
let datasets = new Map<string, JsonValue>();

export const REQUIRED_RUNTIME_DATASETS = [
  'data/ai/concept-aliases.json', 'data/registries/action-semantics.json', 'data/semantic/registry.json',
  'data/mizan/quranic-principles.json', 'data/justice/rules.json', 'data/justice/sources-2026.json',
  'data/fiscal/rules.json', 'data/fiscal/nisab-2026-id.json', 'data/governance/constitutional-template.json',
  'data/revelation/quran-story-patterns.json', 'data/backend/rules.json', 'data/kernel/type-catalog.json',
  'data/divine-books/quran/ayahs.jsonl', 'data/divine-books/witness-corpora/tawrat.jsonl',
  'data/divine-books/witness-corpora/zabur.jsonl', 'data/divine-books/witness-corpora/injil.jsonl',
  'data/divine-books/revelation-corpus-manifest.json', 'data/revelation/source-policy.json',
  'data/revelation/corpus-status.json', 'data/revelation/geography-hypotheses.json',
  'data/revelation/language-concept-anchors.json', 'data/revelation/scoring-profile.json',
  'data/events/event-language-profile.json', 'data/events/moral-lifecycle-language-profile.json',
  'data/revelation/lifecycle-query-profile.json', 'data/revelation/grammar-profile.json',
  'data/revelation/divine-ontology-profile.json',
] as const;

const normalizePath = (value: string): string => value.replaceAll('\\', '/').replace(/^\.\//, '');
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isJsonValue = (value: unknown): value is JsonValue => value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || (Array.isArray(value) ? value.every(isJsonValue) : isRecord(value) && Object.values(value).every(isJsonValue));

function toRuntimeSnapshot(payload: unknown): RuntimeSnapshot {
  if (!isRecord(payload)) return {};
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => isJsonValue(value))) as RuntimeSnapshot;
}

function snapshotToData(payload: Record<string, unknown>): JsonValue {
  if (isJsonValue(payload.data)) return payload.data;
  if (typeof payload.rawText === 'string') { try { const parsed = JSON.parse(payload.rawText) as unknown; return isJsonValue(parsed) ? parsed : payload.rawText; } catch { return payload.rawText; } }
  return isJsonValue(payload) ? payload : null;
}

export async function initializeRuntimeData(repo: EntityRepository, options: { postgres?: boolean } = {}): Promise<void> {
  const next = new Map<string, JsonValue>();
  for (const row of await repo.list()) {
    const seed = row.payload._seed;
    if (!isRecord(seed) || typeof seed.path !== 'string') continue;
    const key = normalizePath(seed.path);
    if (row.type === 'DATASET_SNAPSHOT') { next.set(key, snapshotToData(row.payload)); continue; }
    const value = toRuntimeSnapshot(row.payload); delete value._seed;
    const current = next.get(key);
    next.set(key, current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value]);
  }
  datasets = next; postgresMode = options.postgres === true; revision += 1; initialized = true;
}

export const runtimeDataReady = (): boolean => initialized;
export const runtimeDataRevision = (): number => revision;

export function runtimeDataset<T = JsonValue>(relativePath: string, rootDir = process.cwd()): T {
  const key = normalizePath(relativePath);
  if (initialized) { const value = datasets.get(key); if (value !== undefined) return value as T; if (postgresMode) throw new Error(`RUNTIME_DATA_NOT_SEEDED:${key}`); }
  if (postgresMode) throw new Error(`RUNTIME_DATA_NOT_INITIALIZED:${key}`);
  const full = path.resolve(rootDir, key);
  const parsed = JSON.parse(fs.readFileSync(full, 'utf8')) as unknown;
  if (!isJsonValue(parsed)) throw new Error(`RUNTIME_DATA_INVALID_JSON:${key}`);
  return parsed as T;
}

export function runtimeDatasetOr<T>(relativePath: string, fallback: T, rootDir = process.cwd()): T {
  try { return runtimeDataset<T>(relativePath, rootDir); } catch { return fallback; }
}

export const runtimeDatasetPaths = (): string[] => [...datasets.keys()].sort();
