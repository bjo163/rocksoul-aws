import type { CanonicalEvidenceProvenance } from './evidence-provenance.js';
import type { RevelationGraphNode, RevelationGraphRelation } from './revelation-graph.js';

export type EvidenceGraphBinding = {
  id: string;
  evidenceId: string;
  targetId: string;
  targetKind: RevelationGraphNode['kind'] | 'ENTITY' | 'CASE';
  relation: 'EVIDENCE_SUPPORTS' | 'EVIDENCE_CORROBORATES' | 'EVIDENCE_OBSERVES' | 'EVIDENCE_CONFLICTS' | 'EVIDENCE_DERIVED_FROM';
  lane: 'CORE' | 'DERIVED' | 'UNRESOLVED';
  grounding: 'QURAN_EXPLICIT' | 'DATASET_DERIVED' | 'UNRESOLVED';
  normativeAuthority: boolean;
};

export type EvidenceGraphBindingInput = {
  graph: { nodes: RevelationGraphNode[]; relations: RevelationGraphRelation[] };
  evidence: CanonicalEvidenceProvenance[];
};

function targetFromReference(reference: string | undefined, graphIds: Set<string>): { targetId: string; targetKind: EvidenceGraphBinding['targetKind'] } | null {
  if (!reference) return null;
  if (graphIds.has(reference)) {
    return {
      targetId: reference,
      targetKind: 'PASSAGE',
    };
  }
  const match = /^Q(\d+):(\d+)(?:-(\d+))?$/.exec(reference);
  if (!match) return null;
  const targetId = `QURAN:${Number(match[1])}:${Number(match[2])}-${Number(match[3] ?? match[2])}`;
  return graphIds.has(targetId) ? { targetId, targetKind: 'PASSAGE' } : null;
}

function relationForEvidence(evidence: CanonicalEvidenceProvenance): EvidenceGraphBinding['relation'] {
  if (evidence.grounding === 'EXPLICIT') return 'EVIDENCE_SUPPORTS';
  if (evidence.grounding === 'CORROBORATIVE') return 'EVIDENCE_CORROBORATES';
  if (evidence.grounding === 'OBSERVED') return 'EVIDENCE_OBSERVES';
  if (evidence.grounding === 'CONFLICTED') return 'EVIDENCE_CONFLICTS';
  return 'EVIDENCE_DERIVED_FROM';
}

function laneForEvidence(evidence: CanonicalEvidenceProvenance): EvidenceGraphBinding['lane'] {
  if (evidence.grounding === 'EXPLICIT') return 'CORE';
  if (evidence.grounding === 'DERIVED') return 'DERIVED';
  return evidence.grounding === 'OBSERVED' || evidence.grounding === 'CORROBORATIVE' || evidence.grounding === 'CONFLICTED'
    ? 'DERIVED'
    : 'UNRESOLVED';
}

function groundingForEvidence(evidence: CanonicalEvidenceProvenance): EvidenceGraphBinding['grounding'] {
  if (evidence.grounding === 'EXPLICIT') return 'QURAN_EXPLICIT';
  if (evidence.grounding === 'DERIVED') return 'DATASET_DERIVED';
  return 'UNRESOLVED';
}

export function bindEvidenceToRevelationGraph(input: EvidenceGraphBindingInput): EvidenceGraphBinding[] {
  const graphIds = new Set(input.graph.nodes.map((node) => node.id));
  const bindings: EvidenceGraphBinding[] = [];
  const relationsByTarget = new Set(input.graph.relations.map((relation) => relation.fromId + '|' + relation.toId));

  for (const evidence of input.evidence) {
    const target = targetFromReference(evidence.reference, graphIds);
    if (!target) continue;

    const relation = relationForEvidence(evidence);
    const lane = laneForEvidence(evidence);
    const grounding = groundingForEvidence(evidence);
    const explicitTargetRelation = relationsByTarget.has(target.targetId + '|' + evidence.entityId)
      || relationsByTarget.has(evidence.entityId + '|' + target.targetId);

    bindings.push({
      id: `EBIND-${relation}-${evidence.evidenceId}-${target.targetId}`,
      evidenceId: evidence.evidenceId,
      targetId: target.targetId,
      targetKind: target.targetKind,
      relation,
      lane: explicitTargetRelation && lane === 'UNRESOLVED' ? 'UNRESOLVED' : lane,
      grounding,
      normativeAuthority: evidence.normativeAuthority && evidence.class === 'QURAN_EXPLICIT',
    });
  }

  const relationOrder: Record<EvidenceGraphBinding['relation'], number> = {
    EVIDENCE_SUPPORTS: 0,
    EVIDENCE_CORROBORATES: 1,
    EVIDENCE_OBSERVES: 2,
    EVIDENCE_CONFLICTS: 3,
    EVIDENCE_DERIVED_FROM: 4,
  };
  return bindings.sort((a, b) => relationOrder[a.relation] - relationOrder[b.relation] || a.id.localeCompare(b.id));
}
