export type CanonicalPropheticEvent = {
  id: string;
  title: string;
  prophetId: string;
  quranReferences: string[];
  eventTags: string[];
  evidenceClass: string;
  grounding: 'QURAN_EXPLICIT' | 'UNRESOLVED';
  provenance: 'DATASET_CANONICAL';
};

type RawPropheticEvent = {
  id: string;
  data?: {
    title?: unknown;
    prophetId?: unknown;
    quranReferences?: unknown;
    eventTags?: unknown;
    evidenceClass?: unknown;
  };
};

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

export function normalizePropheticEvents(records: RawPropheticEvent[]): CanonicalPropheticEvent[] {
  return records.map((record) => {
    const quranReferences = strings(record.data?.quranReferences);
    return {
      id: record.id,
      title: typeof record.data?.title === 'string' ? record.data.title : record.id,
      prophetId: typeof record.data?.prophetId === 'string' ? record.data.prophetId : '',
      quranReferences,
      eventTags: strings(record.data?.eventTags),
      evidenceClass: typeof record.data?.evidenceClass === 'string' ? record.data.evidenceClass : 'UNKNOWN',
      grounding: quranReferences.length > 0 ? 'QURAN_EXPLICIT' : 'UNRESOLVED',
      provenance: 'DATASET_CANONICAL',
    };
  });
}
