import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EntityRepository } from '../../packages/persistence/src/types.js';
import type { SemanticDefinition } from '../semantic/semantic-registry.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type RuntimeSnapshot = Record<string, JsonValue>;

let initialized = false;
let postgresMode = false;
let revision = 0;
let datasets = new Map<string, JsonValue>();

const moduleDataRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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
  'data/revelation/divine-ontology-profile.json'
] as const;

function normalizePath(p: string): string { return p.replaceAll('\\', '/').replace(/^\.\//, ''); }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function toRuntimeSnapshot(payload: unknown): RuntimeSnapshot {
  if (!isRecord(payload)) return {};
  const result: RuntimeSnapshot = {};
  for (const [key, value] of Object.entries(payload)) if (isJsonValue(value)) result[key] = value;
  return result;
}

function snapshotToData(payload: Record<string, unknown>): JsonValue {
  const data = payload.data;
  if (isJsonValue(data)) return data;
  const rawText = payload.rawText;
  if (typeof rawText === 'string') {
    try {
      const parsed: unknown = JSON.parse(rawText);
      return isJsonValue(parsed) ? parsed : rawText;
    } catch { return rawText; }
  }
  return isJsonValue(payload) ? payload : null;
}

export async function initializeRuntimeData(repo: EntityRepository, options: { postgres?: boolean } = {}): Promise<void> {
  const rows = await repo.list();
  const next = new Map<string, JsonValue>();
  for (const row of rows) {
    const payload = row.payload;
    const seed = payload._seed;
    if (!isRecord(seed) || typeof seed.path !== 'string') continue;
    const key = normalizePath(seed.path);
    if (row.type === 'DATASET_SNAPSHOT') { next.set(key, snapshotToData(payload)); continue; }
    const cleanPayload = toRuntimeSnapshot(payload);
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

export function runtimeDataset(relativePath: 'data/semantic/registry.json'): { definitions?: Record<string, SemanticDefinition> };
export function runtimeDataset(relativePath: string): JsonValue;
export function runtimeDataset(relativePath: string): JsonValue | { definitions?: Record<string, SemanticDefinition> } {
  const key = normalizePath(relativePath);
  if (initialized) {
    const value = datasets.get(key);
    if (value !== undefined) return value;
    if (postgresMode) throw new Error(`RUNTIME_DATA_NOT_SEEDED:${key}`);
  }
  if (postgresMode) throw new Error(`RUNTIME_DATA_NOT_INITIALIZED:${key}`);
  const candidates = [path.resolve(process.cwd(), key), path.resolve(moduleDataRoot, key)];
  const full = candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0];
  const parsed: unknown = JSON.parse(fs.readFileSync(full, 'utf8'));
  if (!isJsonValue(parsed)) throw new Error(`RUNTIME_DATA_INVALID_JSON:${key}`);
  return parsed;
}

export function runtimeDatasetOr<T>(relativePath: string, fallback: T): T {
  try { return runtimeDataset(relativePath) as T; } catch { return fallback; }
}

export function runtimeDatasetPaths(): string[] { return [...datasets.keys()].sort(); }
