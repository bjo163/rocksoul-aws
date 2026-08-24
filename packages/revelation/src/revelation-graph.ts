export type GraphLane = 'CORE' | 'DERIVED' | 'UNRESOLVED';

export type RevelationGraphNode = {
  id: string;
  kind: 'BOOK' | 'SURAH' | 'PASSAGE' | 'PROPHET_REFERENCE' | 'SCRIPTURE_REFERENCE' | 'PROPHETIC_EVENT';
  lane: GraphLane;
};

export type RevelationGraphRelation = {
  id: string;
  relation: 'BOOK_CONTAINS_SURAH' | 'SURAH_CONTAINS_PASSAGE' | 'PASSAGE_REFERENCES_PROPHET' | 'PROPHET_HAS_EVENT' | 'EVENT_ATTESTED_BY_PASSAGE';
  fromId: string;
  toId: string;
  lane: GraphLane;
  grounding: 'QURAN_EXPLICIT' | 'DATASET_DERIVED' | 'UNRESOLVED';
};

export type RevelationGraphInput = {
  prophets: Array<{ id: string; quranReferences: string[] }>;
  scriptureReferences: Array<{ id: string; bookId: string; reference: string; subjectId?: string; surah?: number; passageStart?: number; passageEnd?: number; grounding: string }>;
  events: Array<{ id: string; prophetId: string; quranReferences: string[]; grounding: string }>;
};

function relationId(relation: string, fromId: string, toId: string): string {
  return `RGRAPH-${relation}-${fromId}-${toId}`;
}

function toLane(grounding: string): GraphLane {
  return grounding === 'QURAN_EXPLICIT' ? 'CORE' : grounding === 'UNRESOLVED' ? 'UNRESOLVED' : 'DERIVED';
}

function toGrounding(value: string): RevelationGraphRelation['grounding'] {
  return value === 'QURAN_EXPLICIT' || value === 'DATASET_DERIVED' || value === 'UNRESOLVED' ? value : 'UNRESOLVED';
}

export function buildRevelationGraph(input: RevelationGraphInput) {
  const nodes = new Map<string, RevelationGraphNode>();
  const relations = new Map<string, RevelationGraphRelation>();

  const addNode = (node: RevelationGraphNode) => {
    const existing = nodes.get(node.id);
    if (!existing || (existing.lane === 'UNRESOLVED' && node.lane === 'CORE')) nodes.set(node.id, node);
  };
  const addRelation = (value: RevelationGraphRelation) => { relations.set(value.id, value); };

  addNode({ id: 'BOOK-QURAN', kind: 'BOOK', lane: 'CORE' });

  for (const reference of input.scriptureReferences) {
    const lane = toLane(reference.grounding);
    const grounding = toGrounding(reference.grounding);
    if (reference.bookId === 'BOOK-QURAN') addNode({ id: 'BOOK-QURAN', kind: 'BOOK', lane: 'CORE' });
    if (reference.surah !== undefined) {
      const surahId = `QURAN:SURAH:${reference.surah}`;
      addNode({ id: surahId, kind: 'SURAH', lane: 'CORE' });
      addRelation({ id: relationId('BOOK_CONTAINS_SURAH', 'BOOK-QURAN', surahId), relation: 'BOOK_CONTAINS_SURAH', fromId: 'BOOK-QURAN', toId: surahId, lane: 'CORE', grounding: 'QURAN_EXPLICIT' });

      const passage = reference.passageStart ?? 0;
      const end = reference.passageEnd ?? passage;
      const passageId = `QURAN:${reference.surah}:${passage}-${end}`;
      addNode({ id: passageId, kind: 'PASSAGE', lane });
      addRelation({ id: relationId('SURAH_CONTAINS_PASSAGE', surahId, passageId), relation: 'SURAH_CONTAINS_PASSAGE', fromId: surahId, toId: passageId, lane, grounding });

      if (reference.subjectId) {
        addNode({ id: reference.subjectId, kind: 'PROPHET_REFERENCE', lane: 'CORE' });
        addRelation({ id: relationId('PASSAGE_REFERENCES_PROPHET', passageId, reference.subjectId), relation: 'PASSAGE_REFERENCES_PROPHET', fromId: passageId, toId: reference.subjectId, lane, grounding });
      }
    }
  }

  for (const prophet of input.prophets) {
    addNode({ id: prophet.id, kind: 'PROPHET_REFERENCE', lane: 'CORE' });
  }

  for (const event of input.events) {
    const lane = toLane(event.grounding);
    const grounding = toGrounding(event.grounding);
    addNode({ id: event.id, kind: 'PROPHETIC_EVENT', lane });
    addNode({ id: event.prophetId, kind: 'PROPHET_REFERENCE', lane: 'CORE' });
    addRelation({ id: relationId('PROPHET_HAS_EVENT', event.prophetId, event.id), relation: 'PROPHET_HAS_EVENT', fromId: event.prophetId, toId: event.id, lane, grounding });
  }

  for (const event of input.events) {
    if (event.grounding !== 'QURAN_EXPLICIT') continue;
    for (const reference of event.quranReferences) {
      const match = /^Q(\d+):(\d+)(?:-(\d+))?$/.exec(reference);
      if (!match) continue;
      const passageId = `QURAN:${Number(match[1])}:${Number(match[2])}-${Number(match[3] ?? match[2])}`;
      addNode({ id: passageId, kind: 'PASSAGE', lane: 'CORE' });
      addRelation({ id: relationId('EVENT_ATTESTED_BY_PASSAGE', event.id, passageId), relation: 'EVENT_ATTESTED_BY_PASSAGE', fromId: event.id, toId: passageId, lane: 'CORE', grounding: 'QURAN_EXPLICIT' });
    }
  }

  const sortedRelations = [...relations.values()].sort((a, b) => a.id.localeCompare(b.id));
  return {
    protocol: 'REVELATION_GRAPH_V1',
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    relations: sortedRelations,
    lanes: {
      core: sortedRelations.filter((item) => item.lane === 'CORE').length,
      derived: sortedRelations.filter((item) => item.lane === 'DERIVED').length,
      unresolved: sortedRelations.filter((item) => item.lane === 'UNRESOLVED').length,
    },
    boundaries: {
      prophetBecomesDivineOntology: false,
      unresolvedPromotedToCore: false,
      inferredChronology: false,
      nonScripturalEvidencePromoted: false,
    },
  };
}
