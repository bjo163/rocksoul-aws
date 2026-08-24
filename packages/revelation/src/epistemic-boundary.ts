export type EpistemicLane = 'CORE' | 'DERIVED' | 'UNRESOLVED';

export type KnowledgeSourceClass =
  | 'REVELATION'
  | 'SCRIPTURAL_METADATA'
  | 'HISTORICAL_REPORT'
  | 'TEXTUAL_WITNESS'
  | 'OBSERVATION'
  | 'INFERENCE'
  | 'AI_OUTPUT'
  | 'GOVERNANCE_RECORD';

const CORE_SOURCE_CLASSES = new Set<KnowledgeSourceClass>([
  'REVELATION',
  'SCRIPTURAL_METADATA',
]);

const DERIVED_SOURCE_CLASSES = new Set<KnowledgeSourceClass>([
  'HISTORICAL_REPORT',
  'TEXTUAL_WITNESS',
  'OBSERVATION',
  'INFERENCE',
  'AI_OUTPUT',
]);

export function enforceEpistemicBoundary(
  lane: EpistemicLane,
  sourceClass: KnowledgeSourceClass,
): EpistemicLane {
  if (lane === 'CORE' && !CORE_SOURCE_CLASSES.has(sourceClass)) return 'DERIVED';
  if (lane === 'DERIVED' && !DERIVED_SOURCE_CLASSES.has(sourceClass) && !CORE_SOURCE_CLASSES.has(sourceClass)) return 'UNRESOLVED';
  return lane;
}

export function resolveProfileLane(input: {
  hasExplicitGrounding: boolean;
  hasDerivedContext?: boolean;
  hasUnresolvedContext?: boolean;
}): EpistemicLane {
  if (input.hasUnresolvedContext) return 'UNRESOLVED';
  if (input.hasDerivedContext && !input.hasExplicitGrounding) return 'DERIVED';
  if (input.hasExplicitGrounding) return 'CORE';
  return 'UNRESOLVED';
}
