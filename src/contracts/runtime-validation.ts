export function isHumanReviewGate(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const gate = value as Record<string, unknown>;
  return gate.protocol === 'HUMAN_REVIEW_GATE_V1'
    && ['ALLOW_ANALYTICAL_DISPLAY', 'REQUIRE_HUMAN_REVIEW', 'BLOCK_ADVERSE_ACTION'].includes(String(gate.decision))
    && gate.analyticalDisplayAllowed === true
    && gate.adverseActionBlocked === true
    && typeof gate.requiresHumanReview === 'boolean'
    && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(gate.severity))
    && Array.isArray(gate.reasons)
    && Array.isArray(gate.evidenceGap)
    && Array.isArray(gate.recommendedReviewActions)
    && typeof gate.boundary === 'string';
}

export function assertHumanReviewGate(value: unknown): void {
  if (!isHumanReviewGate(value)) throw new Error('INVALID_HUMAN_REVIEW_GATE_CONTRACT');
}
