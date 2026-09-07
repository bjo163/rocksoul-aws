import type { AwsTreatyActionCandidate } from './treaty-actions.js';

export type AwsApplicabilityDimensionStatus =
  | 'APPLIES'
  | 'DOES_NOT_APPLY'
  | 'PARTIAL'
  | 'UNCERTAIN';

export type AwsApplicabilityOverall =
  | 'APPLICABLE'
  | 'NOT_APPLICABLE'
  | 'PARTIALLY_APPLICABLE'
  | 'UNCERTAIN';

export interface AwsApplicabilityDimension {
  status: AwsApplicabilityDimensionStatus;
  reasons: string[];
  basis_refs?: string[];
}

export interface AwsApplicabilityDimensions {
  temporal: AwsApplicabilityDimension;
  territorial: AwsApplicabilityDimension;
  personal: AwsApplicabilityDimension;
  subject_matter: AwsApplicabilityDimension;
  jurisdiction: AwsApplicabilityDimension;
}

export function evaluateAwsApplicability(
  dimensions: AwsApplicabilityDimensions,
): AwsApplicabilityOverall {
  const values = Object.values(dimensions).map((dimension) => dimension.status);

  if (values.includes('DOES_NOT_APPLY')) return 'NOT_APPLICABLE';
  if (values.includes('UNCERTAIN')) return 'UNCERTAIN';
  if (values.includes('PARTIAL')) return 'PARTIALLY_APPLICABLE';
  return 'APPLICABLE';
}

const BINDING_PARTICIPATION_ACTIONS = new Set([
  'ratification',
  'accession',
  'acceptance',
  'approval',
  'succession',
]);

export interface AwsTreatyPartyDimensionInput {
  actorRef: string;
  instrumentRef: string;
  asOfDate: string;
  actions: readonly AwsTreatyActionCandidate[];
}

export function deriveAwsTreatyPartyDimension(
  input: AwsTreatyPartyDimensionInput,
): AwsApplicabilityDimension {
  const actions = input.actions
    .filter(
      (action) =>
        action.actor_ref === input.actorRef &&
        action.instrument_ref === input.instrumentRef,
    )
    .sort((a, b) => (a.action_date ?? '').localeCompare(b.action_date ?? ''));

  const bindingBefore = actions.find(
    (action) =>
      BINDING_PARTICIPATION_ACTIONS.has(action.action) &&
      action.action_date !== null && action.action_date <= input.asOfDate,
  );

  if (bindingBefore) {
    return {
      status: 'APPLIES',
      reasons: [
        `${input.actorRef} has a binding participation action (${bindingBefore.action}) dated ${bindingBefore.action_date}, on or before ${input.asOfDate}.`,
      ],
      basis_refs: [],
    };
  }

  const bindingAfter = actions.find((action) =>
    BINDING_PARTICIPATION_ACTIONS.has(action.action) && action.action_date !== null,
  );
  if (bindingAfter) {
    return {
      status: 'DOES_NOT_APPLY',
      reasons: [
        `The first binding participation action found for ${input.actorRef} is ${bindingAfter.action} on ${bindingAfter.action_date}, after ${input.asOfDate}.`,
      ],
      basis_refs: [],
    };
  }

  const signature = actions.find(
    (action) => action.action === 'signature' && action.action_date !== null && action.action_date <= input.asOfDate,
  );
  if (signature) {
    return {
      status: 'DOES_NOT_APPLY',
      reasons: [
        `${input.actorRef} has only a signature record by ${input.asOfDate}; signature alone is not treated as ratification/accession/succession or other binding participation.`,
      ],
      basis_refs: [],
    };
  }

  return {
    status: 'UNCERTAIN',
    reasons: [
      `No binding participation action is available for ${input.actorRef} on or before ${input.asOfDate}; missing data is not treated as non-participation.`,
    ],
    basis_refs: [],
  };
}

export type AwsJurisdictionConsentStatus =
  | 'ESTABLISHED'
  | 'CONTESTED'
  | 'ABSENT'
  | 'UNKNOWN';

export interface AwsJurisdictionDimensionInput {
  forumRef: string | null;
  jurisdictionBasisRefs: readonly string[];
  consentStatus: AwsJurisdictionConsentStatus;
  authoritativeResolution?: 'AFFIRMED' | 'DENIED' | null;
  reservationConflict?: boolean;
  authorityRefs?: readonly string[];
}

export function deriveAwsJurisdictionDimension(
  input: AwsJurisdictionDimensionInput,
): AwsApplicabilityDimension {
  if (input.authoritativeResolution === 'AFFIRMED') {
    return {
      status: 'APPLIES',
      reasons: [
        'A competent authority expressly affirmed jurisdiction for this dispute.',
      ],
      basis_refs: [
        ...input.jurisdictionBasisRefs,
        ...(input.authorityRefs ?? []),
      ],
    };
  }

  if (input.authoritativeResolution === 'DENIED') {
    return {
      status: 'DOES_NOT_APPLY',
      reasons: [
        'A competent authority expressly denied jurisdiction for this dispute.',
      ],
      basis_refs: [
        ...input.jurisdictionBasisRefs,
        ...(input.authorityRefs ?? []),
      ],
    };
  }

  if (!input.forumRef || input.jurisdictionBasisRefs.length === 0) {
    return {
      status: 'UNCERTAIN',
      reasons: [
        'A forum and an explicit jurisdictional basis are both required; court presence alone does not establish jurisdiction.',
      ],
      basis_refs: [...input.jurisdictionBasisRefs],
    };
  }

  if (input.consentStatus === 'ABSENT') {
    return {
      status: 'DOES_NOT_APPLY',
      reasons: ['Required jurisdictional consent is absent.'],
      basis_refs: [...input.jurisdictionBasisRefs],
    };
  }

  if (
    input.consentStatus === 'CONTESTED' ||
    input.reservationConflict === true
  ) {
    return {
      status: 'UNCERTAIN',
      reasons: [
        'Jurisdiction is contested or affected by a reservation/objection conflict and requires authoritative resolution.',
      ],
      basis_refs: [...input.jurisdictionBasisRefs],
    };
  }

  if (input.consentStatus === 'ESTABLISHED') {
    return {
      status: 'APPLIES',
      reasons: ['Jurisdictional consent and an explicit basis are established.'],
      basis_refs: [...input.jurisdictionBasisRefs],
    };
  }

  return {
    status: 'UNCERTAIN',
    reasons: [
      'Jurisdictional basis exists, but consent/competence remains unresolved.',
    ],
    basis_refs: [...input.jurisdictionBasisRefs],
  };
}
