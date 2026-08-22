import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { selectAsmaReminderCandidates } from '../revelation/asma/asma-engine.js';
import { resolve } from 'node:path';
import { randomInt } from 'node:crypto';
import { loadRevelationPatternRegistry } from './revelation-pattern-engine.js';
import { chooseStoryCandidate } from './revelation-story-engine.js';

export type ReminderEvidenceClass = 'QURAN_EXPLICIT' | 'STRUCTURAL_QURAN_DATA' | 'RESEARCH_ONLY' | 'REFERENCE_ONLY';

export interface QuranReminderReference {
  reference: string;
  source: 'QURAN';
  evidenceClass: 'QURAN_EXPLICIT' | 'STRUCTURAL_QURAN_DATA';
  provenance: string[];
}

export interface AsmaReminderReference {
  candidateId: string;
  phrase: string;
  references: string[];
  status: 'SCRIPTURE_ATTESTED' | 'CORROBORATED_SURFACE_CANDIDATE';
  source: 'PURE_REVELATION_ASMA';
}

export interface PreviousScriptureReference {
  book: 'TAWRAT' | 'ZABUR' | 'INJIL';
  bookId: string;
  referenceStatus: 'REFERENCE_ONLY' | 'TEXT_CORPUS_REQUIRED';
  note: string;
  sourceRefs: string[];
}

export interface ReminderBundle {
  id: string;
  storyCandidateId: string;
  quran: QuranReminderReference;
  asma: [AsmaReminderReference, AsmaReminderReference];
  previousScripture: PreviousScriptureReference;
  temporalContext: {
    patternId: string;
    references: string[];
    mode: 'CONTEXT_ONLY';
  };
  delivery: {
    distributionPolicy: 'SIMULATION_ONLY';
    ayahCount: 1;
    note: string;
  };
  provenance: {
    registryVersion: number;
    sources: string[];
  };
}

interface AyahRecord { reference: string; surahNumber: number; verseNumber: number; surahName: string; text: string; }
interface DivineBookRecord { id: string; canonicalName: 'TAWRAT' | 'ZABUR' | 'INJIL'; provenance?: { sourceUrl?: string; notes?: string }; }
interface TemporalPattern { id: string; references: string[]; mode: 'CONTEXT_ONLY'; }

const AYAH_PATH = resolve(resolve(dirname(fileURLToPath(import.meta.url)), '../../'), 'data/divine-books/quran/ayahs.jsonl');
const BOOK_PATH = resolve(resolve(dirname(fileURLToPath(import.meta.url)), '../../'), 'data/divine-books/divine-books.json');
const TEMPORAL_PATH = resolve(resolve(dirname(fileURLToPath(import.meta.url)), '../../'), 'data/revelation/temporal-patterns.json');

async function loadJsonl<T>(path: string): Promise<T[]> {
  const raw = await readFile(path, 'utf8');
  return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

async function loadTemporalPatterns(): Promise<TemporalPattern[]> {
  const raw = JSON.parse(await readFile(TEMPORAL_PATH, 'utf8')) as { patterns: TemporalPattern[] };
  return raw.patterns;
}

async function chooseQuranReference(storyReferences: string[], seed: number): Promise<QuranReminderReference> {
  const ayahs = await loadJsonl<AyahRecord>(AYAH_PATH);
  const exact = new Map(ayahs.map((a) => [a.reference, a]));
  const candidates = storyReferences.flatMap((ref) => {
    const m = ref.match(/^(\d+):(\d+)(?:-(\d+))?$/);
    if (!m) return [];
    const surah = Number(m[1]);
    const start = Number(m[2]);
    const end = Number(m[3] ?? m[2]);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => exact.get(`${surah}:${start + i}`)).filter(Boolean) as AyahRecord[];
  });
  if (!candidates.length) throw new Error('NO_QURAN_AYAH_FOR_STORY');
  const selected = candidates[seed % candidates.length];
  return {
    reference: selected.reference,
    source: 'QURAN',
    evidenceClass: 'QURAN_EXPLICIT',
    provenance: ['QURAN_LOCAL_CORPUS', 'QURAN_NARRATIVE_PATTERN']
  };
}

async function chooseTwoAsma(seed: number): Promise<[AsmaReminderReference, AsmaReminderReference]> {
  const selected = selectAsmaReminderCandidates(seed, 2);
  if (selected.length < 2) throw new Error('REVELATION_ASMA_CANDIDATES_TOO_SMALL');
  return selected.slice(0,2).map(item => ({
    candidateId: item.candidateId,
    phrase: item.phrase,
    references: item.references,
    status: item.status,
    source: 'PURE_REVELATION_ASMA' as const
  })) as [AsmaReminderReference, AsmaReminderReference];
}

async function choosePreviousScripture(seed: number): Promise<PreviousScriptureReference> {
  const books = JSON.parse(await readFile(BOOK_PATH, 'utf8')) as DivineBookRecord[];
  const candidates = books.filter((b) => b.canonicalName !== undefined && ['TAWRAT', 'ZABUR', 'INJIL'].includes(b.canonicalName));
  if (!candidates.length) throw new Error('NO_PREVIOUS_SCRIPTURE_METADATA');
  const book = candidates[seed % candidates.length];
  return {
    book: book.canonicalName,
    bookId: book.id,
    referenceStatus: 'TEXT_CORPUS_REQUIRED',
    note: 'The current registry contains Islamic reference metadata, not a verified corpus of the original revealed text. No unverified Bible/Psalm/Torah passage is fabricated here.',
    sourceRefs: [book.id]
  };
}

export async function composeReminderBundle(seed = randomInt(0, 1_000_000)): Promise<ReminderBundle> {
  const registry = await loadRevelationPatternRegistry();
  const story = await chooseStoryCandidate(seed);
  const quran = await chooseQuranReference(story.references, seed);
  const asma = await chooseTwoAsma(seed);
  const previousScripture = await choosePreviousScripture(seed * 11 + 3);
  const temporalPatterns = await loadTemporalPatterns();
  if (!temporalPatterns.length) throw new Error('NO_TEMPORAL_PATTERNS');
  const temporal = temporalPatterns[seed % temporalPatterns.length];
  return {
    id: `REM-${seed.toString(36)}`,
    storyCandidateId: story.id,
    quran,
    asma,
    previousScripture,
    temporalContext: { patternId: temporal.id, references: temporal.references, mode: temporal.mode },
    delivery: {
      distributionPolicy: 'SIMULATION_ONLY',
      ayahCount: 1,
      note: 'One Qur’an ayah is the default reminder unit. Historical revelation-size distribution is not claimed by this simulator.'
    },
    provenance: {
      registryVersion: registry.version,
      sources: ['QURAN_LOCAL_CORPUS', 'QURAN_NARRATIVE_PATTERN', 'PURE_REVELATION_ASMA', previousScripture.bookId, temporal.id]
    }
  };
}
