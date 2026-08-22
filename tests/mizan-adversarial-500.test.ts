import assert from 'node:assert/strict';
import { createDefaultSemanticProvider } from '../src/ai/provider.js';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';
import { eventAdversarialCases } from '../src/events/verification/adversarial.js';

const neutralContexts = [
  'dalam catatan pemeriksaan',
  'pada waktu yang disebutkan',
  'menurut urutan kejadian',
  'dengan konteks yang sama',
  'tanpa informasi tambahan'
];

const baseCases = eventAdversarialCases();
const cases = baseCases.flatMap((base) => neutralContexts.map((context, index) => ({
  ...base,
  id: `${base.id}-V${index + 1}`,
  text: `${base.text.replace(/[.]$/, '')}, ${context}.`
})));

assert.equal(cases.length, 500);

const provider = createDefaultSemanticProvider(process.cwd());
const baselines = new Map<string, any>();
for (const base of baseCases) {
  const observation = await provider.analyze(base.text);
  baselines.set(base.id, {
    action: observation.action,
    direction: observation.eventInterpretation?.direction,
    state: observation.eventInterpretation?.state
  });
}
let passed = 0;
const failures: any[] = [];
for (const current of cases) {
  const observation = await provider.analyze(current.text);
  const result = buildAiAnalysis(current.text, { semanticObservation: observation });
  const interpretation = observation.eventInterpretation;
  const scorecard = result.revelationScorecard;
  const expectedConflict = Boolean(current.expected.conflict);
  const actualConflict = interpretation?.conflictResolution?.state === 'ACTUAL_CONFLICT';
  const baseline = baselines.get(current.id.replace(/-V\d+$/, ''));
  const checks = {
    action: observation.action === current.expected.action,
    direction: scorecard?.direction === current.expected.direction,
    state: interpretation?.state === current.expected.state,
    conflict: expectedConflict === actualConflict,
    noDivineVerdict: result.quranicMizan?.divineVerdict === false,
    conflictForwarded: scorecard?.eventGraph?.conflictResolution?.state === interpretation?.conflictResolution?.state,
    statusNotEstablishedOnConflict: !actualConflict || result.quranicMizan?.status !== 'ESTABLISHED',
    stableAcrossNeutralContext: Boolean(baseline) &&
      observation.action === baseline.action &&
      interpretation?.direction === baseline.direction &&
      interpretation?.state === baseline.state
  };
  const ok = Object.values(checks).every(Boolean);
  if (ok) passed++;
  else failures.push({ id: current.id, text: current.text, checks, action: observation.action, direction: scorecard?.direction, state: interpretation?.state });
}

assert.deepEqual(failures, []);
assert.equal(passed, 500);
console.log(JSON.stringify({
  ok: true,
  protocol: 'MIZAN_ADVERSARIAL_500_V1',
  cases: cases.length,
  passed,
  groups: [...new Set(baseCases.map(c => c.group))].length,
  boundary: 'This suite validates deterministic software parsing, evidence/conflict propagation and fail-closed status. It is not divine judgement.'
}, null, 2));
