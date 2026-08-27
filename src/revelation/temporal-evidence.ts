import fs from 'node:fs';
import path from 'node:path';
import { runtimeDataReady, runtimeDataset } from '../persistence/runtime-data.js';
import { quranAyah } from './quran-corpus.js';

export type TemporalEvidenceClass = 'E1' | 'E2' | 'E3' | 'E4' | 'E5';

export interface TemporalEvidenceItem {
  id: string;
  evidenceClass: TemporalEvidenceClass;
  reference: string;
  canonicalCorpusReference: string;
  claimBoundary: string;
  provenance: { curation: string; referenceBasis: string; interpretationStatus?: string };
  researchHypothesis?: string;
  explicitRevelation?: false;
}

export interface TemporalEvidenceRegistry {
  protocol: 'QURAN_TEMPORAL_EVIDENCE_V1';
  version: string;
  status: 'FROZEN';
  scope: 'QURAN_PRIMARY_TEMPORAL_EVIDENCE';
  corpus: {
    book: 'QURAN'; manifest: string; manifestVersion: string; canonicalCorpusPath: string;
    canonicalCorpusSha256: string; sourceClass: 'CANONICAL_REFERENCE'; role: 'PRIMARY_MUHAIMIN';
  };
  parser: { id: 'TEMPORAL_EVIDENCE_PARSER_V1'; version: string; method: string; doesNotStoreVerseText: true };
  classes: Record<TemporalEvidenceClass, string>;
  items: TemporalEvidenceItem[];
  boundary: string;
}

let cache: { root: string; registry: TemporalEvidenceRegistry } | null = null;

function readRegistry(root: string): TemporalEvidenceRegistry {
  if (runtimeDataReady()) {
    try { return runtimeDataset('data/revelation/temporal-evidence-v1.json') as TemporalEvidenceRegistry; } catch { /* read canonical file */ }
  }
  return JSON.parse(fs.readFileSync(path.resolve(root, 'data/revelation/temporal-evidence-v1.json'), 'utf8')) as TemporalEvidenceRegistry;
}

function assertRegistry(registry: TemporalEvidenceRegistry, root: string): TemporalEvidenceRegistry {
  if (registry.protocol !== 'QURAN_TEMPORAL_EVIDENCE_V1' || registry.status !== 'FROZEN') throw new Error('Invalid frozen temporal evidence registry');
  for (const item of registry.items) {
    if (!/^\d+:\d+$/.test(item.reference)) throw new Error(`Invalid Quran reference: ${item.reference}`);
    if (item.canonicalCorpusReference !== `${registry.corpus.canonicalCorpusPath}#${item.reference}`) throw new Error(`Invalid canonical corpus reference: ${item.id}`);
    if (!quranAyah(item.reference, root)) throw new Error(`Temporal evidence reference is absent from the Quran corpus: ${item.reference}`);
    if (item.evidenceClass === 'E5') {
      if (item.explicitRevelation !== false || item.provenance.interpretationStatus !== 'RESEARCH_HYPOTHESIS') throw new Error(`E5 must remain research/hypothesis: ${item.id}`);
    } else if (item.researchHypothesis || item.explicitRevelation !== undefined) {
      throw new Error(`Only E5 may carry research interpretation fields: ${item.id}`);
    }
  }
  return registry;
}

/** Loads the immutable reference-only registry; it deliberately never returns verse text. */
export function temporalEvidenceRegistry(root = process.cwd()): Readonly<TemporalEvidenceRegistry> {
  const resolved = path.resolve(root);
  if (cache?.root === resolved) return cache.registry;
  const registry = assertRegistry(readRegistry(resolved), resolved);
  cache = { root: resolved, registry };
  return registry;
}

/** Lets AI/Mizan consumers keep explicit revelation classifications separate from research hypotheses. */
export function temporalEvidenceByClass(evidenceClass: TemporalEvidenceClass, root = process.cwd()): readonly TemporalEvidenceItem[] {
  return temporalEvidenceRegistry(root).items.filter((item) => item.evidenceClass === evidenceClass);
}

export function resetTemporalEvidenceCacheForTests(): void { cache = null; }
