import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TEMPORAL_HYPOTHESIS_IDS,
  TEMPORAL_HYPOTHESIS_REGISTRY,
} from '../packages/tse-engine/src/hypothesis-registry.ts';
import {
  analyzeTemporalScoreSensitivity,
  calculateTemporalScore,
  createTemporalHypothesisResult,
  type TemporalHypothesisStatistics,
} from '../packages/tse-engine/src/temporal-scoring.ts';

test('TSE hypothesis registry has frozen definitions for every planned 45-degree hypothesis', () => {
  assert.deepEqual(TEMPORAL_HYPOTHESIS_IDS, ['H-S45-A', 'H-S45-D', 'H-L45-A', 'H-L45-D', 'H-SM45']);
  for (const id of TEMPORAL_HYPOTHESIS_IDS) {
    const definition = TEMPORAL_HYPOTHESIS_REGISTRY[id];
    assert.equal(definition.frozen, true);
    assert.equal(definition.affectsBaseTemporalRelevance, false);
    assert.equal(definition.interpretation, 'RESEARCH_HYPOTHESIS');
    assert.ok(Object.isFrozen(definition));
    assert.ok(Object.isFrozen(definition.predicate));
  }
  assert.equal(TEMPORAL_HYPOTHESIS_REGISTRY['H-S45-A'].predicate.direction, 'ASCENDING');
  assert.equal(TEMPORAL_HYPOTHESIS_REGISTRY['H-L45-D'].predicate.direction, 'DESCENDING');
  assert.equal(TEMPORAL_HYPOTHESIS_REGISTRY['H-SM45'].predicate.kind, 'SUN_MOON_ANGULAR_SEPARATION');
});

const supported: TemporalHypothesisStatistics = {
  datasetRole: 'HOLDOUT', sampleSize: 120, pValue: 0.004, adjustedPValue: 0.02,
  multipleTestingCorrection: 'BONFERRONI', hypothesisCount: 5, effectSize: 0.32,
  confidenceInterval: { lower: 0.1, upper: 0.54, level: 0.95 }, riskRatio: 1.4,
};

test('hypothesis outcomes are deterministic and use only fixed statistical criteria', () => {
  assert.equal(createTemporalHypothesisResult('H-S45-A', supported).outcome, 'SUPPORTED');
  assert.equal(createTemporalHypothesisResult('H-S45-D', { ...supported, effectSize: -0.2, confidenceInterval: { lower: -0.4, upper: -0.05, level: 0.95 } }).outcome, 'CONTRADICTED');
  const result = createTemporalHypothesisResult('H-L45-A', { ...supported, adjustedPValue: 0.2 });
  assert.equal(result.outcome, 'INCONCLUSIVE');
  assert.equal(result.affectsBaseTemporalRelevance, false);
  assert.equal(result.interpretation, 'RESEARCH_SIGNAL_ONLY');
});

test('scoring separates hypothesis signal from base temporal relevance and marks values analytical', () => {
  const withoutSignal = calculateTemporalScore({ temporalRelevance: 0.8, evidenceStrength: 0.75, hypothesisSignal: 0, confidence: 0.9, dataQuality: 0.95 });
  const withSignal = calculateTemporalScore({ temporalRelevance: 0.8, evidenceStrength: 0.75, hypothesisSignal: 1, confidence: 0.9, dataQuality: 0.95 });
  assert.equal(withoutSignal.baseScore, 0.6);
  assert.equal(withSignal.baseScore, withoutSignal.baseScore);
  assert.equal(withSignal.confidenceAdjustedScore, withoutSignal.confidenceAdjustedScore);
  assert.equal(withSignal.hypothesisAffectsBaseTemporalRelevance, false);
  assert.equal(withSignal.scoreIsNotDivineReward, true);
  assert.equal(withSignal.provenance.hypothesisHandling, 'REPORTED_SEPARATELY_NOT_ADDED_TO_BASE_SCORE');
});

test('unresolved astronomical state fails closed and sensitivity remains deterministic', () => {
  const unresolved = calculateTemporalScore({ temporalRelevance: 1, evidenceStrength: 1, hypothesisSignal: 1, confidence: 0.2, dataQuality: 0.2, astronomicalDataStatus: 'UNRESOLVED' });
  assert.equal(unresolved.status, 'UNRESOLVED');
  assert.equal(unresolved.confidenceAdjustedScore, null);
  const sensitivity = analyzeTemporalScoreSensitivity(
    { temporalRelevance: 0.8, evidenceStrength: 0.75, hypothesisSignal: 1, confidence: 0.9, dataQuality: 0.95 },
    [{ id: 'conservative', confidenceWeight: 0.7, dataQualityWeight: 0.8 }],
  );
  assert.deepEqual(sensitivity, [{ id: 'conservative', confidenceAdjustedScore: 0.336 }]);
});
