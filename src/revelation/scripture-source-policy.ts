import { runtimeDatasetOr } from '../persistence/runtime-data.js';
import fs from 'node:fs';
import path from 'node:path';
import {
  corroborationSourceGuardPure,
  isAllowedNormativeBook as isCanonicalNormativeBook,
  normativeSourceGuardPure,
  type ScriptureBook,
} from '../../packages/revelation/src/source-policy.js';

type Loose = Record<string, any>;
export type { ScriptureBook };

export function scriptureSourcePolicy(): Loose {
  return runtimeDatasetOr('data/revelation/source-policy.json', { version: 'unknown', mode: 'FOUR_BOOKS_ONLY', normativeSources: [], excludedFromNormativeReasoning: [] }) as Loose;
}

export function scriptureCorpusStatus(): Loose {
  return runtimeDatasetOr('data/revelation/corpus-status.json', { version: 'unknown', books: {} }) as Loose;
}

export function isAllowedNormativeBook(book: string): boolean {
  return isCanonicalNormativeBook(book);
}

function localWitnessFile(book: string, root = process.cwd()): string | null {
  const rel: Record<string, string> = {
    TAWRAT: 'data/divine-books/witness-corpora/tawrat.jsonl',
    ZABUR: 'data/divine-books/witness-corpora/zabur.jsonl',
    INJIL: 'data/divine-books/witness-corpora/injil.jsonl',
  };
  const p = rel[String(book).toUpperCase()];
  if (!p) return null;
  try {
    return fs.statSync(path.resolve(root, p)).isFile() ? p : null;
  } catch {
    return null;
  }
}

/** Primary normative use is intentionally stricter than corroboration use. */
export function corpusReadyForNormativeUse(book: string): boolean {
  const key = String(book).toUpperCase();
  const state = scriptureCorpusStatus()?.books?.[key];
  if (key === 'QURAN') return Boolean(state && ['AVAILABLE_CANONICAL_REFERENCE', 'AVAILABLE_TRUSTED_CORPUS'].includes(String(state.status)));
  return false;
}

export function corpusReadyForCorroboration(book: string, root = process.cwd()): boolean {
  const key = String(book).toUpperCase();
  if (key === 'QURAN') return corpusReadyForNormativeUse(key);
  return Boolean(localWitnessFile(key, root));
}

export function normativeSourceGuard(input: { book?: string; sourceClass?: string }): { allowed: boolean; reason: string } {
  return normativeSourceGuardPure({ ...input, corpusReady: corpusReadyForNormativeUse(String(input.book ?? '')) });
}

export function corroborationSourceGuard(input: { book?: string; sourceClass?: string; root?: string }): { allowed: boolean; reason: string } {
  return corroborationSourceGuardPure({ ...input, corpusReady: corpusReadyForCorroboration(String(input.book ?? ''), input.root ?? process.cwd()) });
}
