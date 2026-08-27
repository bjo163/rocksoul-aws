import fs from 'node:fs';
import path from 'node:path';
import { runtimeDataReady, runtimeDataset } from '../persistence/runtime-data.js';
import { loadQuranCorpus, type QuranAyah } from './quran-corpus.js';

type Loose = Record<string, unknown>;
type TemporalPhase = 'NIGHT' | 'DAWN' | 'DAY' | 'EVENING' | 'UNKNOWN';

interface TemporalPattern {
  id: string;
  references: string[];
  mode?: string;
}

interface TemporalProfile {
  version: string;
  clockPhases: Array<{ id: TemporalPhase; startMinute: number; endMinute: number }>;
  textSignals: Record<string, string[]>;
  quranPatterns: Record<string, string[]>;
  boundary?: string;
}

let cache: { root: string; profile: TemporalProfile; patterns: TemporalPattern[] } | null = null;

function readJson(root: string, relative: string): unknown {
  if (runtimeDataReady()) {
    try { return runtimeDataset(relative); } catch { /* fallback below */ }
  }
  return JSON.parse(fs.readFileSync(path.resolve(root, relative), 'utf8'));
}

function loadProfile(root = process.cwd()): { profile: TemporalProfile; patterns: TemporalPattern[] } {
  const resolved = path.resolve(root);
  if (cache?.root === resolved) return { profile: cache.profile, patterns: cache.patterns };
  const profile = readJson(resolved, 'data/revelation/temporal-significance.json') as TemporalProfile;
  const patternsDoc = readJson(resolved, 'data/revelation/temporal-patterns.json');
  const patterns = Array.isArray(patternsDoc?.patterns) ? patternsDoc.patterns as TemporalPattern[] : [];
  cache = { root: resolved, profile, patterns };
  return { profile, patterns };
}

function normalizeText(value: string): string {
  return String(value ?? '').toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function parseClock(value: unknown): { hour: number; minute: number; source: 'TEXT' | 'TIMESTAMP' } | null {
  const text = String(value ?? '').trim();
  const direct = text.match(/\b([01]?\d|2[0-3])(?::([0-5]\d))\b/);
  if (direct) return { hour: Number(direct[1]), minute: Number(direct[2]), source: 'TEXT' };
  const timestamp = Date.parse(text);
  if (Number.isFinite(timestamp) && /[T\s]\d{2}:\d{2}/.test(text)) {
    const match = text.match(/[T\s]([01]\d|2[0-3]):([0-5]\d)/);
    if (match) return { hour: Number(match[1]), minute: Number(match[2]), source: 'TIMESTAMP' };
  }
  return null;
}

function phaseFromClock(hour: number, minute: number, profile: TemporalProfile): TemporalPhase {
  const minuteOfDay = hour * 60 + minute;
  const match = profile.clockPhases.find((range) => {
    if (range.startMinute < range.endMinute) return minuteOfDay >= range.startMinute && minuteOfDay < range.endMinute;
    return minuteOfDay >= range.startMinute || minuteOfDay < range.endMinute;
  });
  return match?.id ?? 'UNKNOWN';
}

function textPhases(text: string, profile: TemporalProfile): TemporalPhase[] {
  const normalized = normalizeText(text);
  const hits: TemporalPhase[] = [];
  for (const [phase, aliases] of Object.entries(profile.textSignals ?? {})) {
    if ((aliases ?? []).some((alias) => normalized.includes(normalizeText(alias)))) hits.push(phase as TemporalPhase);
  }
  return hits;
}

function referencesForPhases(phases: TemporalPhase[], profile: TemporalProfile, patterns: TemporalPattern[]) {
  const ids = new Set<string>();
  for (const phase of phases) for (const id of profile.quranPatterns?.[phase] ?? []) ids.add(id);
  const selected = patterns.filter((pattern) => ids.has(pattern.id));
  const references = [...new Set(selected.flatMap((pattern) => pattern.references.map((ref) => String(ref).replace(/^Q/i, ''))))];
  return { patternIds: selected.map((p) => p.id), references, patterns: selected };
}

function verifiedEvidence(references: string[], corpus: QuranAyah[]) {
  const map = new Map(corpus.map((ayah) => [ayah.reference, ayah]));
  const verified = references.filter((ref) => map.has(ref));
  const missing = references.filter((ref) => !map.has(ref));
  return {
    verifiedRefs: verified,
    missingRefs: missing,
    passages: verified.map((ref) => map.get(ref)!).filter(Boolean)
  };
}

function inferEvidenceStrength(verifiedCount: number, missingCount: number, phaseCount: number): number {
  const total = verifiedCount + missingCount;
  if (!verifiedCount || !total) return 0;
  const coverage = verifiedCount / total;
  const diversity = Math.min(1, phaseCount / 2);
  return Number((coverage * (0.7 + diversity * 0.3)).toFixed(4));
}

function classifyStrength(strength: number): string {
  if (strength >= 0.75) return 'STRONG_CONTEXT_SUPPORT';
  if (strength >= 0.45) return 'SUPPORTED_CONTEXT';
  if (strength > 0) return 'LIMITED_CONTEXT_SUPPORT';
  return 'UNRESOLVED';
}

export interface TemporalSignificanceInput {
  text?: string;
  timestamp?: string;
  hour?: number;
  minute?: number;
  root?: string;
}

export function evaluateTemporalSignificance(input: TemporalSignificanceInput = {}): Loose {
  const root = input.root ?? process.cwd();
  const { profile, patterns } = loadProfile(root);
  const text = String(input.text ?? '');
  const explicitTextPhases = textPhases(text, profile);
  const clock = input.hour !== undefined && input.minute !== undefined
    ? { hour: Number(input.hour), minute: Number(input.minute), source: 'TEXT' as const }
    : parseClock(input.timestamp ?? text);
  const phases = new Set<TemporalPhase>(explicitTextPhases);
  if (clock) phases.add(phaseFromClock(clock.hour, clock.minute, profile));
  phases.delete('UNKNOWN');
  const phaseList = [...phases];
  const evidence = referencesForPhases(phaseList, profile, patterns);
  const corpusEvidence = verifiedEvidence(evidence.references, loadQuranCorpus(root));
  const strength = inferEvidenceStrength(corpusEvidence.verifiedRefs.length, corpusEvidence.missingRefs.length, phaseList.length);
  return {
    protocol: 'TEMPORAL_SIGNIFICANCE_ENGINE_V1',
    version: profile.version,
    clock: clock ? { hour: clock.hour, minute: clock.minute, source: clock.source } : null,
    phases: phaseList,
    significance: {
      level: classifyStrength(strength),
      strength,
      source: corpusEvidence.verifiedRefs.length ? 'QURAN_CORPUS_TEMPORAL_PATTERNS' : 'UNRESOLVED',
      notRewardQuantity: true
    },
    evidence: {
      patternIds: evidence.patternIds,
      refs: corpusEvidence.verifiedRefs.map((ref) => `Q${ref}`),
      missingRefs: corpusEvidence.missingRefs.map((ref) => `Q${ref}`),
      passages: corpusEvidence.passages.map((ayah) => ({ reference: `Q${ayah.reference}`, text: ayah.text }))
    },
    boundary: 'Temporal phase mapping is an engineering normalization. Significance is an evidence-strength signal from configured temporal patterns and the bundled Quran corpus; it is not a divine reward multiplier.',
    profile: {
      source: 'data/revelation/temporal-significance.json',
      temporalPatternSource: 'data/revelation/temporal-patterns.json'
    }
  };
}

export function resetTemporalSignificanceCacheForTests(): void { cache = null; }
