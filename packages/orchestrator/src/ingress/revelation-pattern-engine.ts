import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export type RevelationPatternType =
  | 'GRADUAL_REVELATION'
  | 'HISTORICAL_REPORT'
  | 'SPECIAL_NIGHT'
  | 'MESSENGER_DESCENT_PATTERN';

export interface RevelationPattern {
  id: string;
  type: RevelationPatternType;
  passage?: string;
  count?: number;
  references: string[];
  evidenceClass: string;
  selection: string;
  temporalWindow?: string;
  rule?: string;
}

export interface RevelationPatternRegistry {
  version: number;
  policy: {
    defaultUnit: string;
    distributionIntent: string;
    note: string;
    weights: Record<string, number>;
    hardRule: string;
  };
  patterns: RevelationPattern[];
}

const here = dirname(fileURLToPath(import.meta.url));

const REGISTRY_PATH = resolve(here, '../../../../data/revelation/revelation-patterns.json');
const SOURCES_PATH = resolve(here, '../../../../data/revelation/research-sources.json');

export async function loadRevelationPatternRegistry(): Promise<RevelationPatternRegistry> {
  return JSON.parse(await readFile(REGISTRY_PATH, 'utf8')) as RevelationPatternRegistry;
}

export async function loadRevelationResearchSources(): Promise<{ version: number; sources: unknown[] }> {
  return JSON.parse(await readFile(SOURCES_PATH, 'utf8')) as { version: number; sources: unknown[] };
}

export function selectSimulatedPassageSize(random = randomInt(0, 100)): keyof RevelationPatternRegistry['policy']['weights'] {
  if (random < 70) return 'SINGLE_AYAH';
  if (random < 92) return 'SHORT_PASSAGE_2_5';
  if (random < 99) return 'PASSAGE_6_10';
  return 'LARGE_PASSAGE_GT10';
}

export function getReferencePatterns(registry: RevelationPatternRegistry): RevelationPattern[] {
  return registry.patterns.filter((pattern) => pattern.selection !== 'DO_NOT_USE_FOR_AUTOMATIC_SCHEDULING');
}

export function chooseReminderPattern(registry: RevelationPatternRegistry, seed = randomInt(0, 100)): RevelationPattern {
  const selectable = getReferencePatterns(registry).filter((pattern) => pattern.selection !== 'FOUNDATIONAL');
  if (selectable.length === 0) throw new Error('NO_REVELATION_REFERENCE_PATTERNS');

  // Weighted simulation is deliberately confined to message-size distribution.
  // It never represents a claim that the selected event is actual revelation.
  const size = selectSimulatedPassageSize(seed);
  if (size === 'SINGLE_AYAH') {
    const candidates = selectable.filter((pattern) => pattern.count === undefined || pattern.count <= 1 || pattern.selection === 'SPECIAL_CONTEXT');
    if (candidates.length) return candidates[seed % candidates.length];
  }
  if (size === 'SHORT_PASSAGE_2_5') {
    const candidates = selectable.filter((pattern) => (pattern.count ?? 1) >= 2 && (pattern.count ?? 5) <= 5);
    if (candidates.length) return candidates[seed % candidates.length];
  }
  if (size === 'PASSAGE_6_10') {
    const candidates = selectable.filter((pattern) => (pattern.count ?? 0) >= 6 && (pattern.count ?? 0) <= 10);
    if (candidates.length) return candidates[seed % candidates.length];
  }
  return selectable[seed % selectable.length];
}