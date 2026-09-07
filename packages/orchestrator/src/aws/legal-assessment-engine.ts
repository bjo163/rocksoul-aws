export type AwsClaimAssessmentResult =
  | 'SUPPORTED'
  | 'CONTRADICTED'
  | 'MIXED'
  | 'UNRESOLVED'
  | 'NOT_REACHED';

export interface AwsClaimAssessmentInput {
  applicability: 'APPLICABLE' | 'NOT_APPLICABLE' | 'PARTIALLY_APPLICABLE' | 'UNCERTAIN';
  supportingHoldingRefs: readonly string[];
  contradictingHoldingRefs: readonly string[];
}

export function evaluateAwsClaimAssessment(
  input: AwsClaimAssessmentInput,
): AwsClaimAssessmentResult {
  if (input.applicability === 'NOT_APPLICABLE') return 'NOT_REACHED';
  if (input.applicability === 'UNCERTAIN' || input.applicability === 'PARTIALLY_APPLICABLE') return 'UNRESOLVED';

  const hasSupport = input.supportingHoldingRefs.length > 0;
  const hasContradiction = input.contradictingHoldingRefs.length > 0;

  if (hasSupport && hasContradiction) return 'MIXED';
  if (hasSupport) return 'SUPPORTED';
  if (hasContradiction) return 'CONTRADICTED';
  return 'UNRESOLVED';
}

export type AwsCaseSynthesisResult =
  | 'CONSISTENT_SUPPORT'
  | 'CONSISTENT_CONTRADICTION'
  | 'MIXED_HOLDINGS'
  | 'UNRESOLVED';

export function synthesizeAwsCase(
  results: readonly AwsClaimAssessmentResult[],
): AwsCaseSynthesisResult {
  if (results.length === 0) return 'UNRESOLVED';

  const material = results.filter((result) => result !== 'NOT_REACHED');
  if (material.length === 0) return 'UNRESOLVED';
  if (material.some((result) => result === 'UNRESOLVED' || result === 'MIXED')) {
    return 'UNRESOLVED';
  }

  const hasSupported = material.includes('SUPPORTED');
  const hasContradicted = material.includes('CONTRADICTED');

  if (hasSupported && hasContradicted) return 'MIXED_HOLDINGS';
  if (hasSupported) return 'CONSISTENT_SUPPORT';
  if (hasContradicted) return 'CONSISTENT_CONTRADICTION';
  return 'UNRESOLVED';
}
