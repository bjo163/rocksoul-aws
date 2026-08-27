/**
 * Frozen, research-only definitions for temporal hypotheses.
 *
 * These definitions describe observable predicates. They are not revealed
 * rules, timestamp-specific Qur'anic evidence, or inputs to base relevance.
 */
export const TEMPORAL_HYPOTHESIS_REGISTRY_VERSION = 'TSE_TEMPORAL_HYPOTHESES_V1' as const;

export type TemporalHypothesisId = 'H-S45-A' | 'H-S45-D' | 'H-L45-A' | 'H-L45-D' | 'H-SM45';
export type HypothesisDatasetRole = 'DISCOVERY' | 'CONTROL' | 'HOLDOUT';
export type HypothesisOutcome = 'SUPPORTED' | 'INCONCLUSIVE' | 'CONTRADICTED';
export type HypothesisPredicateKind = 'ALTITUDE_CROSSING' | 'SUN_MOON_ANGULAR_SEPARATION';
export type CrossingDirection = 'ASCENDING' | 'DESCENDING';

export interface TemporalHypothesisDefinition {
  readonly id: TemporalHypothesisId;
  readonly label: string;
  readonly predicate: {
    readonly kind: HypothesisPredicateKind;
    readonly body?: 'SUN' | 'MOON';
    readonly direction?: CrossingDirection;
    readonly targetDegrees: 45;
  };
  /** Definitions are frozen before datasets are analysed. */
  readonly frozen: true;
  readonly datasetRoles: readonly HypothesisDatasetRole[];
  readonly interpretation: 'RESEARCH_HYPOTHESIS';
  readonly affectsBaseTemporalRelevance: false;
  readonly boundary: string;
}

function define(definition: TemporalHypothesisDefinition): TemporalHypothesisDefinition {
  return Object.freeze({
    ...definition,
    predicate: Object.freeze({ ...definition.predicate }),
    datasetRoles: Object.freeze([...definition.datasetRoles]),
  });
}

const roles = Object.freeze(['DISCOVERY', 'CONTROL', 'HOLDOUT'] as const);
const boundary = 'Research hypothesis only: this predicate is neither timestamp-specific revelation nor a divine reward, punishment, judgement, or automatic temporal-relevance bonus.';

/** A machine-readable registry. Consumers should key results by its stable ids. */
export const TEMPORAL_HYPOTHESIS_REGISTRY: Readonly<Record<TemporalHypothesisId, TemporalHypothesisDefinition>> = Object.freeze({
  'H-S45-A': define({
    id: 'H-S45-A',
    label: 'Sun altitude +45° ascending',
    predicate: { kind: 'ALTITUDE_CROSSING', body: 'SUN', direction: 'ASCENDING', targetDegrees: 45 },
    frozen: true, datasetRoles: roles, interpretation: 'RESEARCH_HYPOTHESIS', affectsBaseTemporalRelevance: false, boundary,
  }),
  'H-S45-D': define({
    id: 'H-S45-D',
    label: 'Sun altitude +45° descending',
    predicate: { kind: 'ALTITUDE_CROSSING', body: 'SUN', direction: 'DESCENDING', targetDegrees: 45 },
    frozen: true, datasetRoles: roles, interpretation: 'RESEARCH_HYPOTHESIS', affectsBaseTemporalRelevance: false, boundary,
  }),
  'H-L45-A': define({
    id: 'H-L45-A',
    label: 'Moon altitude +45° ascending',
    predicate: { kind: 'ALTITUDE_CROSSING', body: 'MOON', direction: 'ASCENDING', targetDegrees: 45 },
    frozen: true, datasetRoles: roles, interpretation: 'RESEARCH_HYPOTHESIS', affectsBaseTemporalRelevance: false, boundary,
  }),
  'H-L45-D': define({
    id: 'H-L45-D',
    label: 'Moon altitude +45° descending',
    predicate: { kind: 'ALTITUDE_CROSSING', body: 'MOON', direction: 'DESCENDING', targetDegrees: 45 },
    frozen: true, datasetRoles: roles, interpretation: 'RESEARCH_HYPOTHESIS', affectsBaseTemporalRelevance: false, boundary,
  }),
  'H-SM45': define({
    id: 'H-SM45',
    label: 'Sun–Moon angular geometry = 45°',
    predicate: { kind: 'SUN_MOON_ANGULAR_SEPARATION', targetDegrees: 45 },
    frozen: true, datasetRoles: roles, interpretation: 'RESEARCH_HYPOTHESIS', affectsBaseTemporalRelevance: false, boundary,
  }),
});

export const TEMPORAL_HYPOTHESIS_IDS = Object.freeze(Object.keys(TEMPORAL_HYPOTHESIS_REGISTRY) as TemporalHypothesisId[]);

export function getTemporalHypothesis(id: TemporalHypothesisId): TemporalHypothesisDefinition {
  return TEMPORAL_HYPOTHESIS_REGISTRY[id];
}
