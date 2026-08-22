// @ts-nocheck
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, Number(v ?? 0)));

/**
 * Confidence is epistemic, not normative: it must never be added to Mizan risk.
 * Semantic understanding is the strongest signal; evidence and source authority
 * improve confidence without turning confidence into a harm score.
 */
export function confidenceScore({ evidence = 0.5, rule = 0.5, semantic = 0.5, context = 0.5, sourceAuthority = 0.5, conflictPenalty = 0 } = {}) {
  const raw = 0.20 * clamp(evidence) + 0.10 * clamp(rule) + 0.45 * clamp(semantic) + 0.15 * clamp(context) + 0.10 * clamp(sourceAuthority) - clamp(conflictPenalty) * 0.2;
  return Number(clamp(raw).toFixed(4));
}
export function confidenceBand(score) {
  if (score >= 0.85) return 'HIGH';
  if (score >= 0.65) return 'MEDIUM';
  if (score >= 0.4) return 'LOW';
  return 'VERY_LOW';
}
