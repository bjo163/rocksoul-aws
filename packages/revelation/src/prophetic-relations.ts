export type RelationLane = 'CORE' | 'DERIVED' | 'UNRESOLVED';

export type PropheticRelation = {
  relationId: string;
  relation: string;
  fromId: string;
  toId: string;
  lane: RelationLane;
  grounding: 'QURAN_EXPLICIT' | 'DATASET_DERIVED' | 'UNRESOLVED';
  references: string[];
};

export type ProphetRecord = {
  id: string;
  name: string;
  role?: string;
  sourceProfiles?: string[];
  metadata?: {
    quranReferences?: string[];
    missionTags?: string[];
  };
};

export type ScriptureReference = {
  id?: string;
  data?: {
    sourceId?: string;
    reference?: string;
    prophetId?: string;
    relationType?: string;
  };
};

export type PropheticEvent = {
  id: string;
  data?: {
    prophetId?: string;
    quranReferences?: string[];
    eventTags?: string[];
    title?: string;
    evidenceClass?: string;
  };
};

export type PropheticRelationInput = {
  prophets: ProphetRecord[];
  scriptureReferences: ScriptureReference[];
  events: PropheticEvent[];
};

function refs(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function stableRelationId(relation: string, fromId: string, toId: string): string {
  return `PREL-${relation}-${fromId}-${toId}`;
}

export function buildPropheticRelations(input: PropheticRelationInput) {
  const { prophets, scriptureReferences, events } = input;
  const relations: PropheticRelation[] = [];

  for (const prophet of prophets) {
    const prophetRefs = refs(prophet.metadata?.quranReferences);
    if (prophetRefs.length === 0) continue;
    relations.push({
      relationId: stableRelationId('PROPHET_SOURCE_PROFILE', prophet.id, 'QURAN'),
      relation: 'PROPHET_SOURCE_PROFILE',
      fromId: prophet.id,
      toId: 'BOOK-QURAN',
      lane: 'CORE',
      grounding: 'QURAN_EXPLICIT',
      references: prophetRefs,
    });
  }

  for (const item of scriptureReferences) {
    const data = item.data;
    if (!data?.prophetId || !data.reference) continue;
    relations.push({
      relationId: stableRelationId('SCRIPTURE_ATTESTS_PROPHET', data.reference, data.prophetId),
      relation: 'SCRIPTURE_ATTESTS_PROPHET',
      fromId: data.reference,
      toId: data.prophetId,
      lane: data.sourceId === 'BOOK-QURAN' ? 'CORE' : 'DERIVED',
      grounding: data.sourceId === 'BOOK-QURAN' ? 'QURAN_EXPLICIT' : 'DATASET_DERIVED',
      references: [data.reference],
    });
  }

  for (const event of events) {
    const data = event.data;
    if (!data?.prophetId) continue;
    const eventRefs = refs(data.quranReferences);
    relations.push({
      relationId: stableRelationId('PROPHET_HAS_EVENT', data.prophetId, event.id),
      relation: 'PROPHET_HAS_EVENT',
      fromId: data.prophetId,
      toId: event.id,
      lane: eventRefs.length ? 'CORE' : 'UNRESOLVED',
      grounding: eventRefs.length ? 'QURAN_EXPLICIT' : 'UNRESOLVED',
      references: eventRefs,
    });
    if (eventRefs.length) {
      relations.push({
        relationId: stableRelationId('EVENT_ATTESTED_BY_PASSAGE', event.id, eventRefs.join('|')),
        relation: 'EVENT_ATTESTED_BY_PASSAGE',
        fromId: event.id,
        toId: eventRefs.join('|'),
        lane: 'CORE',
        grounding: 'QURAN_EXPLICIT',
        references: eventRefs,
      });
    }
  }

  for (const prophet of prophets) {
    const missionTags = refs(prophet.metadata?.missionTags);
    if (missionTags.length) {
      relations.push({
        relationId: stableRelationId('PROPHET_HAS_MISSION_SIGNAL', prophet.id, missionTags.join('|')),
        relation: 'PROPHET_HAS_MISSION_SIGNAL',
        fromId: prophet.id,
        toId: missionTags.join('|'),
        lane: 'DERIVED',
        grounding: 'DATASET_DERIVED',
        references: refs(prophet.metadata?.quranReferences),
      });
    }
  }

  return {
    protocol: 'REVELATION_PROPHETIC_RELATIONS_V1',
    version: '4.32.0',
    counts: {
      prophets: prophets.length,
      scriptureReferences: scriptureReferences.length,
      propheticEvents: events.length,
      relations: relations.length,
    },
    lanes: {
      core: relations.filter((item) => item.lane === 'CORE').length,
      derived: relations.filter((item) => item.lane === 'DERIVED').length,
      unresolved: relations.filter((item) => item.lane === 'UNRESOLVED').length,
    },
    relations,
    boundaries: {
      historicalChronologyInferred: false,
      externalProphetSourcesUsed: false,
      prophetBecomesDivineOntology: false,
      unresolvedRelationsPromotedToCore: false,
    },
  };
}
