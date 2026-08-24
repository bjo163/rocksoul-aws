export type KnowledgeContextKind = 'PASSAGE' | 'PROPHETIC_EVENT';

export type KnowledgeContext = {
  id: string;
  kind: KnowledgeContextKind;
  prophetId?: string;
  placeReferences?: string[];
  peopleReferences?: string[];
  provenance?: 'DATASET_CANONICAL' | 'DERIVED';
};

export type CanonicalContextRelation = {
  id: string;
  fromId: string;
  type: 'OCCURS_AT' | 'INVOLVES';
  toId: string;
  contextId: string;
  epistemicLane: 'CORE' | 'DERIVED' | 'UNRESOLVED';
  sourceClass: 'REVELATION' | 'SCRIPTURAL_METADATA' | 'HISTORICAL_REPORT' | 'TEXTUAL_WITNESS' | 'OBSERVATION' | 'INFERENCE' | 'AI_OUTPUT' | 'GOVERNANCE_RECORD';
  provenance: 'DATASET_CANONICAL' | 'DERIVED';
};

function refs(value: string[] | undefined): string[] {
  return [...new Set((value ?? []).filter((item): item is string => typeof item === 'string' && item.trim().length > 0))].sort();
}

export function buildPeoplePlaceRelations(contexts: KnowledgeContext[]): CanonicalContextRelation[] {
  const relations: CanonicalContextRelation[] = [];

  for (const context of [...contexts].sort((a, b) => a.id.localeCompare(b.id))) {
    const lane: CanonicalContextRelation['epistemicLane'] = context.provenance === 'DATASET_CANONICAL' ? 'CORE' : 'DERIVED';
    const sourceClass: CanonicalContextRelation['sourceClass'] = context.provenance === 'DATASET_CANONICAL' ? 'REVELATION' : 'INFERENCE';

    for (const placeId of refs(context.placeReferences)) {
      relations.push({
        id: `context:${context.id}:occurs-at:${placeId}`,
        fromId: context.id,
        type: 'OCCURS_AT',
        toId: placeId,
        contextId: context.id,
        epistemicLane: lane,
        sourceClass,
        provenance: context.provenance === 'DATASET_CANONICAL' ? 'DATASET_CANONICAL' : 'DERIVED',
      });
    }

    for (const personId of refs(context.peopleReferences)) {
      relations.push({
        id: `context:${context.id}:involves:${personId}`,
        fromId: context.id,
        type: 'INVOLVES',
        toId: personId,
        contextId: context.id,
        epistemicLane: lane,
        sourceClass,
        provenance: context.provenance === 'DATASET_CANONICAL' ? 'DATASET_CANONICAL' : 'INFERENCE',
      });
    }
  }

  return relations.sort((a, b) => a.id.localeCompare(b.id));
}
