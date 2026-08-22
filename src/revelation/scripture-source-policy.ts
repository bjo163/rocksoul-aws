import { runtimeDatasetOr } from '../persistence/runtime-data.js';
import fs from 'node:fs';
import path from 'node:path';

type Loose = Record<string, any>;
export type ScriptureBook = 'QURAN'|'TAWRAT'|'ZABUR'|'INJIL';

const NON_NORMATIVE_CLASSES = new Set([
  'HADITH','TAFSIR','ASBAB_REPORT','SCHOLARLY_INTERPRETATION','HISTORICAL_CHRONOLOGY',
  'MEDICAL_SOURCE','LEGAL_SOURCE','NEWS','WEB_RESEARCH','TEXTUAL_WITNESS_MANIFEST'
]);

export function scriptureSourcePolicy(): Loose {
  return runtimeDatasetOr('data/revelation/source-policy.json', { version: 'unknown', mode: 'FOUR_BOOKS_ONLY', normativeSources: [], excludedFromNormativeReasoning: [] }) as Loose;
}
export function scriptureCorpusStatus(): Loose {
  return runtimeDatasetOr('data/revelation/corpus-status.json', { version: 'unknown', books: {} }) as Loose;
}
export function isAllowedNormativeBook(book: string): boolean { return ['QURAN','TAWRAT','ZABUR','INJIL'].includes(String(book).toUpperCase()); }

function localWitnessFile(book:string, root=process.cwd()):string|null {
  const rel:{[k:string]:string}={TAWRAT:'data/divine-books/witness-corpora/tawrat.jsonl',ZABUR:'data/divine-books/witness-corpora/zabur.jsonl',INJIL:'data/divine-books/witness-corpora/injil.jsonl'};
  const p=rel[String(book).toUpperCase()]; if(!p) return null;
  try { return fs.statSync(path.resolve(root,p)).isFile()?p:null; } catch { return null; }
}

/** Primary normative use is intentionally stricter than corroboration use. */
export function corpusReadyForNormativeUse(book: string): boolean {
  const key=String(book).toUpperCase(); const state=scriptureCorpusStatus()?.books?.[key];
  if(key==='QURAN') return Boolean(state && ['AVAILABLE_CANONICAL_REFERENCE','AVAILABLE_TRUSTED_CORPUS'].includes(String(state.status)));
  // v4.24: textual witnesses never become standalone primary normative authority.
  return false;
}

export function corpusReadyForCorroboration(book:string, root=process.cwd()):boolean {
  const key=String(book).toUpperCase();
  if(key==='QURAN') return corpusReadyForNormativeUse(key);
  return Boolean(localWitnessFile(key,root));
}

export function normativeSourceGuard(input: { book?: string; sourceClass?: string }): { allowed: boolean; reason: string } {
  const book=String(input.book??'').toUpperCase(); const sourceClass=String(input.sourceClass??'').toUpperCase();
  if(!isAllowedNormativeBook(book)) return {allowed:false,reason:'BOOK_NOT_IN_FOUR_BOOK_POLICY'};
  if(NON_NORMATIVE_CLASSES.has(sourceClass)||sourceClass==='TEXTUAL_WITNESS') return {allowed:false,reason:'SOURCE_CLASS_NOT_PRIMARY_NORMATIVE'};
  if(!corpusReadyForNormativeUse(book)) return {allowed:false,reason:'CORPUS_NOT_AVAILABLE_FOR_PRIMARY_NORMATIVE_USE'};
  return {allowed:true,reason:'QURAN_PRIMARY_CORPUS_ALLOWED'};
}

export function corroborationSourceGuard(input:{book?:string;sourceClass?:string;root?:string}):{allowed:boolean;reason:string}{
  const book=String(input.book??'').toUpperCase(); const sourceClass=String(input.sourceClass??'').toUpperCase();
  if(!['TAWRAT','ZABUR','INJIL'].includes(book)) return {allowed:false,reason:'BOOK_NOT_CORROBORATIVE_WITNESS_CHANNEL'};
  if(sourceClass!=='TEXTUAL_WITNESS') return {allowed:false,reason:'CORROBORATION_REQUIRES_TEXTUAL_WITNESS_CLASS'};
  if(!corpusReadyForCorroboration(book,input.root??process.cwd())) return {allowed:false,reason:'LOCAL_WITNESS_TEXT_NOT_IMPORTED'};
  return {allowed:true,reason:'TEXTUAL_WITNESS_CORROBORATION_ALLOWED_CONFIDENCE_ONLY'};
}
