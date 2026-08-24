export type EvidenceRelationKind =
  | 'EVIDENCE_SUPPORTS_PASSAGE'
  | 'EVIDENCE_CORROBORATES_PASSAGE'
  | 'EVIDENCE_SUPPORTS_PROPHET_REFERENCE'
  | 'EVIDENCE_CORROBORATES_PROPHET_REFERENCE'
  | 'EVIDENCE_SUPPORTS_EVENT'
  | 'EVIDENCE_CORROBORATES_EVENT'
  | 'EVIDENCE_OBSERVES_EVENT'
  | 'EVIDENCE_DERIVED_FROM_EVENT'
  | 'EVIDENCE_CONFLICTS_WITH_EVENT';

export type EvidenceRelationGrounding = 'EXPLICIT' | 'CORROBORATIVE' | 'OBSERVED' | 'DERIVED' | 'CONFLICTED' | 'UNKNOWN';

export type ExplicitEvidenceRelation = {
  id: string;
  evidenceId: string;
  targetId: string;
  targetKind: 'PASSAGE' | 'PROPHET_REFERENCE' | 'PROPHETIC_EVENT';
  relation: EvidenceRelationKind;
  grounding: EvidenceRelationGrounding;
  provenance: 'CANONICAL_RECORD' | 'RUNTIME_OBSERVATION' | 'DERIVED_ENGINE' | 'UNKNOWN';
};

type RelationInput = {
  evidenceId: string;
  targetId?: unknown;
  targetKind?: unknown;
  evidenceClass?: unknown;
  grounding?: unknown;
  provenance?: unknown;
};

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function relationFor(targetKind: ExplicitEvidenceRelation['targetKind'], evidenceClass: string, grounding: string): EvidenceRelationKind | undefined {
  if (targetKind === 'PASSAGE') {
    if (evidenceClass === 'QURAN_EXPLICIT' && grounding === 'EXPLICIT') return 'EVIDENCE_SUPPORTS_PASSAGE';
    if (evidenceClass === 'TEXTUAL_WITNESS_CORROBORATION') return 'EVIDENCE_CORROBORATES_PASSAGE';
  }

  if (targetKind === 'PROPHET_REFERENCE') {
    if (evidenceClass === 'QURAN_EXPLICIT' && grounding === 'EXPLICIT') return 'EVIDENCE_SUPPORTS_PROPHET_REFERENCE';
    if (evidenceClass === 'TEXTUAL_WITNESS_CORROBORATION') return 'EVIDENCE_CORROBORATES_PROPHET_REFERENCE';
  }

  if (targetKind === 'PROPHETIC_EVENT') {
    if (evidenceClass === 'QURAN_EXPLICIT' && grounding === 'EXPLICIT') return 'EVIDENCE_SUPPORTS_EVENT';
    if (evidenceClass === 'TEXTUAL_WITNESS_CORROBORATION') return 'EVIDENCE_CORROBORATES_EVENT';
    if (evidenceClass === 'OBSERVED') return 'EVIDENCE_OBSERVES_EVENT';
    if (evidenceClass === 'INFERRED' || evidenceClass === 'ENGINE_DERIVED' || evidenceClass === 'AI_INFERENCE') return 'EVIDENCE_DERIVED_FROM_EVENT';
    if (evidenceClass === 'CONFLICTED') return 'EVIDENCE_CONFLICTS_WITH_EVENT';
  }

  return undefined;
}

export function buildExplicitEvidenceRelations(records: RelationInput[]): ExplicitEvidenceRelation[] {
  const relations = new Map<string, ExplicitEvidenceRelation>();

  for (const record of records) {
    const evidenceId = text(record.evidenceId);
    const targetId = text(record.targetId);
    const targetKind = text(record.targetKind) as ExplicitEvidenceRelation['targetKind'] | undefined;
    if (!evidenceId || !targetId || !targetKind || !['PASSAGE', 'PROPHET_REFERENCE', 'PROPHETIC_EVENT'].includes(targetKind)) continue;

    const evidenceClass = text(record.evidenceClass) ?? 'UNKNOWN';
    const grounding = text(record.grounding) ?? 'UNKNOWN';
    const relation = relationFor(targetKind, evidenceClass, grounding);
    if (!relation) continue;

    const provenance = text(record.provenance) as ExplicitEvidenceRelation['provenance'] | undefined;
    const safeProvenance = provenance && ['CANONICAL_RECORD', 'RUNTIME_OBSERVATION', 'DERIVED_ENGINE', 'UNKNOWN'].includes(provenance)
      ? provenance
      : 'UNKNOWN';
    const safeGrounding = ['EXPLICIT', 'CORROBORATIVE', 'OBSERVED', 'DERIVED', 'CONFLICTED', 'UNKNOWN'].includes(grounding)
      ? grounding as EvidenceRelationGrounding
      : 'UNKNOWN';

    const id = `EREF-${relation}-${evidenceId}-${targetId}`;
    relations.set(id, {
      id,
      evidenceId,
      targetId,
      targetKind,
      relation,
      grounding: safeGrounding,
      provenance: safeProvenance,
    });
  }

  return [...relations.values()].sort((a, b) => a.id.localeCompare(b.id));
}
