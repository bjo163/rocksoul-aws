type Loose = Record<string, any>;

export type ReviewDecision = 'ALLOW_ANALYTICAL_DISPLAY' | 'REQUIRE_HUMAN_REVIEW' | 'BLOCK_ADVERSE_ACTION';

export interface HumanReviewGate {
  protocol: 'HUMAN_REVIEW_GATE_V1';
  decision: ReviewDecision;
  analyticalDisplayAllowed: true;
  adverseActionBlocked: true;
  requiresHumanReview: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: Array<{ code: string; detail: string; evidenceRefs: string[] }>;
  evidenceGap: string[];
  recommendedReviewActions: string[];
  boundary: string;
}

const refs = (observed: Loose, scorecard: Loose): string[] => [...new Set([
  ...(observed?.quranGrounding?.direct ?? []),
  ...(observed?.quranGrounding?.principles ?? []),
  ...(scorecard?.grounding?.refs ?? [])
].map(String).filter(Boolean))];

export function buildHumanReviewGate({ observed = {}, quranicMizan = null, scorecard = null, conflicts = [] }: Loose = {}): HumanReviewGate {
  const q = quranicMizan ?? {};
  const s = scorecard ?? {};
  const eventResolution = observed?.eventInterpretation?.conflictResolution ?? null;
  const actualConflict = eventResolution?.state === 'ACTUAL_CONFLICT' ||
    (Array.isArray(conflicts) && conflicts.some((conflict: Loose) => String(conflict?.status).toUpperCase() === 'ACTUAL_CONFLICT')) ||
    q?.epistemic?.conflictPresent === true;
  const status = String(q?.status ?? 'UNKNOWN').toUpperCase();
  const evidenceState = String(q?.epistemic?.evidenceState ?? 'INSUFFICIENT').toUpperCase();
  const quranCoverage = String(q?.quranGrounding?.coverage ?? observed?.quranGrounding?.coverage ?? 'NONE').toUpperCase();
  const evidenceRefs = refs(observed, s);
  const reasons: HumanReviewGate['reasons'] = [];
  const evidenceGap: string[] = [];
  const reviewActions: string[] = [];

  if (actualConflict) {
    reasons.push({ code: 'ACTUAL_CONFLICT', detail: 'Opposing event interpretations remain unresolved; software applies no normative priority.', evidenceRefs });
    reviewActions.push('REVIEW_CONFLICTING_EVENT_SIDES');
  }
  if (status === 'RESERVED') {
    reasons.push({ code: 'FINAL_OUTCOME_RESERVED', detail: 'The input touches unseen or final outcomes reserved outside software analysis.', evidenceRefs });
    evidenceGap.push('FINAL_OUTCOME_IS_NOT_OBSERVABLE');
    reviewActions.push('REMOVE_UNSEEN_OUTCOME_CLAIM');
  }
  if (evidenceState !== 'VERIFIED') {
    reasons.push({ code: 'EVIDENCE_NOT_VERIFIED', detail: `Evidence state is ${evidenceState}; the described facts remain conditional.`, evidenceRefs });
    evidenceGap.push('VERIFY_FACTUAL_EVENT');
    reviewActions.push('VERIFY_PRIMARY_EVIDENCE');
  }
  if (quranCoverage === 'NONE') {
    reasons.push({ code: 'NO_QURAN_GROUNDING', detail: 'No sufficient Quran-primary grounding was retrieved for this analysis.', evidenceRefs });
    evidenceGap.push('REVELATION_GROUNDING');
    reviewActions.push('DO_NOT_INFER_NORMATIVE_DIRECTION');
  }
  if (q?.quranGrounding?.empiricalRequired === true || observed?.quranGrounding?.empiricalRequired === true) {
    reasons.push({ code: 'EMPIRICAL_BRIDGE_REQUIRED', detail: 'The available Revelation relation does not supply the empirical fact needed to conclude this case.', evidenceRefs });
    evidenceGap.push('ALLOWED_EMPIRICAL_EVIDENCE');
    reviewActions.push('SUPPLY_VERIFIABLE_EMPIRICAL_EVIDENCE');
  }
  if (status === 'PROVISIONAL') {
    reasons.push({ code: 'PROVISIONAL_FINDING', detail: 'The analytical direction is conditional and must not be treated as an established accusation.', evidenceRefs });
  }
  if (status === 'INSUFFICIENT_EVIDENCE' || status === 'UNKNOWN') {
    reasons.push({ code: 'INSUFFICIENT_EVIDENCE', detail: 'The available input is not sufficient for a stable analytical finding.', evidenceRefs });
    evidenceGap.push('CLEARER_EVENT_DESCRIPTION');
    reviewActions.push('REQUEST_CLARIFICATION');
  }

  const decision: ReviewDecision = actualConflict || status === 'RESERVED'
    ? 'BLOCK_ADVERSE_ACTION'
    : reasons.length
      ? 'REQUIRE_HUMAN_REVIEW'
      : 'ALLOW_ANALYTICAL_DISPLAY';
  const severity: HumanReviewGate['severity'] = actualConflict || status === 'RESERVED'
    ? 'CRITICAL'
    : status === 'INSUFFICIENT_EVIDENCE' || status === 'UNKNOWN'
      ? 'HIGH'
      : reasons.length > 1
        ? 'MEDIUM'
        : 'LOW';

  return {
    protocol: 'HUMAN_REVIEW_GATE_V1',
    decision,
    analyticalDisplayAllowed: true,
    adverseActionBlocked: true,
    requiresHumanReview: decision !== 'ALLOW_ANALYTICAL_DISPLAY',
    severity,
    reasons,
    evidenceGap: [...new Set(evidenceGap)],
    recommendedReviewActions: [...new Set(reviewActions)],
    boundary: 'This gate controls software display and adverse-action safety. It is not a divine verdict and does not determine final moral or unseen outcomes.'
  };
}
