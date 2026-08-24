export type ScriptureGrounding = 'QURAN_EXPLICIT' | 'DATASET_DERIVED' | 'UNRESOLVED';

export type CanonicalScriptureReference = {
  id: string;
  sourceId: string;
  bookId: string;
  reference: string;
  subjectId?: string;
  relationType?: string;
  surah?: number;
  passageStart?: number;
  passageEnd?: number;
  grounding: ScriptureGrounding;
  provenance: 'DATASET_CANONICAL';
};

type RawScriptureReference = {
  id: string;
  data?: {
    sourceId?: unknown;
    reference?: unknown;
    prophetId?: unknown;
    relationType?: unknown;
  };
};

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseQuranReference(reference: string): Pick<CanonicalScriptureReference, 'bookId' | 'surah' | 'passageStart' | 'passageEnd'> {
  const match = /^Q(\d+):(\d+)(?:-(\d+))?$/.exec(reference);
  if (!match) return { bookId: 'UNKNOWN' };

  const surah = Number(match[1]);
  const passageStart = Number(match[2]);
  const passageEnd = match[3] ? Number(match[3]) : passageStart;
  if (!Number.isInteger(surah) || !Number.isInteger(passageStart) || !Number.isInteger(passageEnd)) {
    return { bookId: 'UNKNOWN' };
  }

  return { bookId: 'BOOK-QURAN', surah, passageStart, passageEnd };
}

export function normalizeScriptureReferences(records: RawScriptureReference[]): CanonicalScriptureReference[] {
  return records.flatMap((record) => {
    const sourceId = text(record.data?.sourceId);
    const reference = text(record.data?.reference);
    if (!sourceId || !reference) return [];

    const parsed = parseQuranReference(reference);
    const subjectId = text(record.data?.prophetId);
    const relationType = text(record.data?.relationType);

    return [{
      id: record.id,
      sourceId,
      bookId: parsed.bookId,
      reference,
      ...(subjectId ? { subjectId } : {}),
      ...(relationType ? { relationType } : {}),
      ...(parsed.surah ? { surah: parsed.surah } : {}),
      ...(parsed.passageStart ? { passageStart: parsed.passageStart } : {}),
      ...(parsed.passageEnd ? { passageEnd: parsed.passageEnd } : {}),
      grounding: sourceId === 'BOOK-QURAN'
        ? 'QURAN_EXPLICIT'
        : parsed.bookId === 'UNKNOWN'
          ? 'UNRESOLVED'
          : 'DATASET_DERIVED',
      provenance: 'DATASET_CANONICAL',
    } satisfies CanonicalScriptureReference];
  });
}
