import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AWS_RESEARCH_AUTOMATION_BOUNDARY,
  awsResearchPressure,
  awsRpsV1,
  prioritizeAwsResearchActions,
} from '../packages/orchestrator/src/aws/research-priority.js';

test('LAW unresolved source and applicability gates outrank routine discovery', () => {
  const ranked = prioritizeAwsResearchActions([
    { id: 'discover-another-judgment', lifecycle: 'discovered', kind: 'DISCOVERY', noveltyValue: 20 },
    { id: 'resolve-source-gate', lifecycle: 'needs_sources', kind: 'PROGRESSION', unresolvedSourceGate: true, evidenceGain: 10 },
    { id: 'resolve-applicability-gate', lifecycle: 'source_inspected', kind: 'PROGRESSION', unresolvedApplicabilityGate: true, evidenceGain: 10 },
  ]);
  assert.notEqual(ranked[0].kind, 'DISCOVERY');
  assert.ok(ranked[0].unresolvedSourceGate || ranked[0].unresolvedApplicabilityGate);
});

test('LAW WIP pressure suppresses routine discovery while unresolved legal gates exist', () => {
  const actions = [
    { id: 'gate', lifecycle: 'needs_sources', kind: 'PROGRESSION', unresolvedApplicabilityGate: true },
    { id: 'discovery', lifecycle: 'discovered', kind: 'DISCOVERY', noveltyValue: 20 },
  ] as const;
  const pressure = awsResearchPressure([...actions]);
  assert.equal(pressure.suppressDiscovery, true);
  assert.ok(awsRpsV1(actions[0], pressure) > awsRpsV1(actions[1], pressure));
});

test('deterministic provider scheduler remains distinct from the :30 AI Steward slot', () => {
  assert.equal(AWS_RESEARCH_AUTOMATION_BOUNDARY.aiStewardSlot, ':30');
  assert.equal(AWS_RESEARCH_AUTOMATION_BOUNDARY.aiStewardClass, 'AI_INTELLIGENCE_STEWARD');
  assert.equal(AWS_RESEARCH_AUTOMATION_BOUNDARY.providerSchedulerClass, 'DETERMINISTIC_PROVIDER_MONITOR');
  assert.equal(AWS_RESEARCH_AUTOMATION_BOUNDARY.providerSchedulerSymbol, 'AwsResearchScheduler');
  assert.equal(AWS_RESEARCH_AUTOMATION_BOUNDARY.providerSchedulerReplacementAllowed, false);
});
