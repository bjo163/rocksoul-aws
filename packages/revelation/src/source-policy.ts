export type ScriptureBook = 'QURAN' | 'TAWRAT' | 'ZABUR' | 'INJIL';

const FOUR_BOOKS = new Set<ScriptureBook>(['QURAN', 'TAWRAT', 'ZABUR', 'INJIL']);
const NON_NORMATIVE_CLASSES = new Set([
  'HADITH',
  'TAFSIR',
  'ASBAB_REPORT',
  'SCHOLARLY_INTERPRETATION',
  'HISTORICAL_CHRONOLOGY',
  'MEDICAL_SOURCE',
  'LEGAL_SOURCE',
  'NEWS',
  'WEB_RESEARCH',
  'TEXTUAL_WITNESS_MANIFEST',
]);

export function normalizeBook(book: string): string {
  return String(book).toUpperCase();
}

export function isAllowedNormativeBook(book: string): boolean {
  return FOUR_BOOKS.has(normalizeBook(book) as ScriptureBook);
}

export function normativeSourceGuardPure(input: { book?: string; sourceClass?: string; corpusReady?: boolean }) {
  const book = normalizeBook(input.book ?? '');
  const sourceClass = normalizeBook(input.sourceClass ?? '');
  if (!isAllowedNormativeBook(book)) {
    return { allowed: false, reason: 'BOOK_NOT_IN_FOUR_BOOK_POLICY' } as const;
  }
  if (NON_NORMATIVE_CLASSES.has(sourceClass) || sourceClass === 'TEXTUAL_WITNESS') {
    return { allowed: false, reason: 'SOURCE_CLASS_NOT_PRIMARY_NORMATIVE' } as const;
  }
  if (!input.corpusReady) {
    return { allowed: false, reason: 'CORPUS_NOT_AVAILABLE_FOR_PRIMARY_NORMATIVE_USE' } as const;
  }
  return { allowed: true, reason: 'QURAN_PRIMARY_CORPUS_ALLOWED' } as const;
}

export function corroborationSourceGuardPure(input: { book?: string; sourceClass?: string; corpusReady?: boolean }) {
  const book = normalizeBook(input.book ?? '');
  const sourceClass = normalizeBook(input.sourceClass ?? '');
  if (!['TAWRAT', 'ZABUR', 'INJIL'].includes(book)) {
    return { allowed: false, reason: 'BOOK_NOT_CORROBORATIVE_WITNESS_CHANNEL' } as const;
  }
  if (sourceClass !== 'TEXTUAL_WITNESS') {
    return { allowed: false, reason: 'CORROBORATION_REQUIRES_TEXTUAL_WITNESS_CLASS' } as const;
  }
  if (!input.corpusReady) {
    return { allowed: false, reason: 'LOCAL_WITNESS_TEXT_NOT_IMPORTED' } as const;
  }
  return { allowed: true, reason: 'TEXTUAL_WITNESS_CORROBORATION_ALLOWED_CONFIDENCE_ONLY' } as const;
}
