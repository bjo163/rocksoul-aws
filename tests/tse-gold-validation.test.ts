import assert from 'node:assert/strict';
import test from 'node:test';
import { TSE_GOLD_DATASET, TSE_GOLD_DATASET_VERSION } from '../data/tse/gold-dataset.ts';
import { summarizeErrors, validateGoldDataset, type EventError } from '../data/tse/gold-validation.ts';
import { calculateTemporalState } from '../packages/tse-engine/src/index.ts';

test('TSE gold dataset has versioned USNO provenance and isolates non-numeric polar fixtures', () => {
  const verified = TSE_GOLD_DATASET.filter((fixture) => fixture.validationStatus === 'VERIFIED');
  const structural = TSE_GOLD_DATASET.filter((fixture) => fixture.validationStatus === 'STRUCTURAL_ONLY');
  assert.match(TSE_GOLD_DATASET_VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(verified.length, 2);
  assert.equal(structural.length, 1);
  for (const fixture of verified) {
    assert.equal(fixture.source.publisher, 'U.S. Naval Observatory');
    assert.match(fixture.source.url, /^https:\/\/aa\.usno\.navy\.mil\//);
    assert.equal(fixture.source.sourcePrecision, 'ONE_MINUTE');
  }
  assert.equal(structural[0].scenario, 'POLAR_NO_EVENT');
  assert.match(structural[0].exclusionReason, /must not contribute synthetic error data/i);
});

test('TSE reports deterministic aggregate and per-event errors against verified USNO vectors', () => {
  const report = validateGoldDataset((fixture) => calculateTemporalState({
    timestamp: fixture.timestamp,
    location: fixture.location,
    nightModel: 'SUNSET_TO_SUNRISE',
  }), TSE_GOLD_DATASET, TSE_GOLD_DATASET_VERSION);

  assert.equal(report.verifiedFixtureCount, 2);
  assert.deepEqual(report.skippedFixtureIds, ['STRUCTURAL-POLAR-LONGYEARBYEN-2026-06-21']);
  assert.equal(report.overall.count, 4);
  assert.equal(report.byEvent.sunrise.count, 2);
  assert.equal(report.byEvent.sunset.count, 2);
  assert.ok(report.overall.maeMinutes !== null);
  assert.ok(report.overall.rmseMinutes !== null);
  assert.ok(report.overall.medianMinutes !== null);
  assert.ok(report.overall.maxMinutes !== null);
  assert.ok(report.overall.p95Minutes !== null);
  assert.equal(report.passed, true, JSON.stringify(report));
});

test('gold metric definitions use deterministic interpolation for median and p95', () => {
  const errors = [1, 2, 3, 4].map((absoluteErrorMinutes, index): EventError => ({
    fixtureId: `fixture-${index}`,
    event: index % 2 === 0 ? 'sunrise' : 'sunset',
    expectedLocalTime: '00:00',
    actualLocalTime: '00:00',
    absoluteErrorMinutes,
    withinTolerance: true,
  }));
  assert.deepEqual(summarizeErrors(errors), {
    count: 4,
    maeMinutes: 2.5,
    rmseMinutes: 2.738613,
    medianMinutes: 2.5,
    maxMinutes: 4,
    p95Minutes: 3.85,
  });
});
