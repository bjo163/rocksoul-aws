export type AwsResearchLifecycle = 'discovered' | 'triaged' | 'needs_sources' | 'source_inspected' | 'ready_for_observation';

export interface AwsResearchAction {
  id: string;
  lifecycle: AwsResearchLifecycle;
  kind: 'PROGRESSION' | 'DISCOVERY' | 'VALIDATION' | 'HANDOFF';
  unresolvedSourceGate?: boolean;
  unresolvedApplicabilityGate?: boolean;
  evidenceGain?: number;
  crossDomainValue?: number;
  freshnessValue?: number;
  noveltyValue?: number;
  diversityPenalty?: number;
}

export interface AwsResearchPressure {
  actionable: number;
  preferProgression: boolean;
  suppressDiscovery: boolean;
}

const LIFECYCLE_PRIORITY: Record<AwsResearchLifecycle, number> = {
  ready_for_observation: 100,
  source_inspected: 90,
  needs_sources: 70,
  triaged: 55,
  discovered: 35,
};

export const AWS_RESEARCH_AUTOMATION_BOUNDARY = Object.freeze({
  aiStewardSlot: ':30',
  aiStewardClass: 'AI_INTELLIGENCE_STEWARD',
  providerSchedulerClass: 'DETERMINISTIC_PROVIDER_MONITOR',
  providerSchedulerSymbol: 'AwsResearchScheduler',
  providerSchedulerReplacementAllowed: false,
});

export function awsResearchPressure(actions: AwsResearchAction[], softLimit = 8, hardLimit = 16): AwsResearchPressure {
  const actionable = actions.filter((action) => action.lifecycle in LIFECYCLE_PRIORITY).length;
  const unresolvedGates = actions.filter((action) => action.unresolvedSourceGate || action.unresolvedApplicabilityGate).length;
  return {
    actionable,
    preferProgression: actionable >= softLimit || unresolvedGates > 0,
    suppressDiscovery: actionable >= hardLimit || unresolvedGates > 0,
  };
}

export function awsRpsV1(action: AwsResearchAction, pressure: AwsResearchPressure): number {
  const progressionValue = Math.round((LIFECYCLE_PRIORITY[action.lifecycle] / 100) * 30);
  const gateValue = (action.unresolvedSourceGate ? 12 : 0) + (action.unresolvedApplicabilityGate ? 12 : 0);
  const evidenceGain = Math.min(25, Math.max(0, action.evidenceGain ?? 0));
  const crossDomainValue = Math.min(15, Math.max(0, action.crossDomainValue ?? 0));
  const freshnessValue = Math.min(10, Math.max(0, action.freshnessValue ?? 0));
  const noveltyValue = Math.min(20, Math.max(0, action.noveltyValue ?? 0));
  const diversityPenalty = Math.min(20, Math.max(0, action.diversityPenalty ?? 0));
  const discoveryPenalty = action.kind === 'DISCOVERY'
    ? pressure.suppressDiscovery ? 30 : pressure.preferProgression ? 15 : 0
    : 0;
  return Math.max(0, Math.min(100,
    progressionValue + gateValue + evidenceGain + crossDomainValue + freshnessValue + noveltyValue
    - diversityPenalty - discoveryPenalty,
  ));
}

export function prioritizeAwsResearchActions(actions: AwsResearchAction[]): Array<AwsResearchAction & { rps: number }> {
  const pressure = awsResearchPressure(actions);
  return actions
    .map((action) => ({ ...action, rps: awsRpsV1(action, pressure) }))
    .sort((a, b) => {
      const aGate = Number(Boolean(a.unresolvedSourceGate)) + Number(Boolean(a.unresolvedApplicabilityGate));
      const bGate = Number(Boolean(b.unresolvedSourceGate)) + Number(Boolean(b.unresolvedApplicabilityGate));
      return bGate - aGate
        || LIFECYCLE_PRIORITY[b.lifecycle] - LIFECYCLE_PRIORITY[a.lifecycle]
        || b.rps - a.rps
        || a.id.localeCompare(b.id);
    });
}

export function awsResearchSignal(action: AwsResearchAction & { rps: number }, before: AwsResearchLifecycle, after: AwsResearchLifecycle) {
  return {
    run_id: `AWS-STEWARD-${action.id}`,
    timestamp: new Date().toISOString(),
    slot: 'law-bootstrap',
    action: before === after ? 'BLOCKED' : 'ADVANCED',
    domain: 'LAW',
    repository: 'rocksoul-aws',
    headline: action.id,
    why_it_matters: 'Resolve source and applicability gates before routine discovery; legal holdings do not automatically become EVENT truth.',
    evidence_gain: Math.min(25, Math.max(0, action.evidenceGain ?? 0)),
    cross_domain_value: Math.min(15, Math.max(0, action.crossDomainValue ?? 0)),
    novelty: Math.min(20, Math.max(0, action.noveltyValue ?? 0)),
    lifecycle_before: before,
    lifecycle_after: after,
    related_domains: [],
    relationship_handoff: null,
    next_gate: action.unresolvedSourceGate ? 'SOURCE_GATE' : action.unresolvedApplicabilityGate ? 'APPLICABILITY_GATE' : 'LEGAL_REVIEW',
    evidence: [`rps_v1:${action.rps}`],
  } as const;
}
