import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';
import { calculateTemporalState, toMizanTemporalContext } from '../packages/tse-engine/src/index.ts';

const location = {
  name: 'Tambun',
  region: 'West Java',
  country: 'Indonesia',
  latitude: -6.21194,
  longitude: 107.27833,
  timezone: 'Asia/Jakarta'
};

const fajr = '2026-08-28T04:37:00+07:00';
const timestamp = '2026-08-28T03:00:00+07:00';

function stateFor(activity) {
  return calculateTemporalState({
    timestamp,
    location,
    activity: { type: activity },
    nightModel: 'SUNSET_TO_FAJR',
    nightBoundary: { endTimestamp: fajr, label: 'FAJR' }
  });
}

test('TSE produces a deterministic temporal state for the Cosmic reference case', () => {
  const state = stateFor('PRAYER');
  assert.equal(state.protocol, 'TEMPORAL_SIGNIFICANCE_ENGINE_V1');
  assert.equal(state.night.finalThird, true);
  assert.equal(state.scoring.activityIndependent, true);
  assert.equal(state.provenance.provider, 'astronomy-engine');
  assert.equal(state.scoring.astronomicalDataStatus, 'RESOLVED');
  assert.equal(state.scoring.dataQuality, 1);
  assert.equal(state.provenance.providerConfidence, 0.98);
  assert.ok(Number.isFinite(state.solar.altitudeDeg));
  assert.ok(Number.isFinite(state.lunar.altitudeDeg));
});

test('TSE hypothesis signals never leak into the base temporal score', () => {
  const state = stateFor('PRAYER');
  const nearFull = Math.min(Math.abs(state.lunar.phaseAngleDeg), Math.abs(180 - state.lunar.phaseAngleDeg)) <= 5 ? 5 : 0;
  const expectedBase = 20 + (state.night.finalThird ? 30 : 0) + (state.night.segment !== 'DAY' && state.night.segment !== 'UNRESOLVED' ? 10 : 0) + nearFull;
  assert.equal(state.scoring.rawScore, expectedBase);
  assert.equal(state.scoring.hypothesisSignalScore >= 0, true);
});

test('TSE is activity-neutral: world, amal, dosa, and crime share the same temporal facts', () => {
  const prayer = stateFor('PRAYER');
  const amal = stateFor('AMAL');
  const world = stateFor('WORLD_ACTIVITY');
  const dosa = stateFor('DOSA');
  const crime = stateFor('CRIME');

  const pick = (state) => ({
    solar: state.solar,
    lunar: state.lunar,
    night: state.night,
    markers: state.markers,
    scoring: state.scoring
  });

  assert.deepEqual(pick(prayer), pick(amal));
  assert.deepEqual(pick(prayer), pick(world));
  assert.deepEqual(pick(prayer), pick(dosa));
  assert.deepEqual(pick(prayer), pick(crime));
});

test('TSE temporal context forwards into existing Mizan/AI timeFactor contract', () => {
  const state = stateFor('PRAYER');
  const context = toMizanTemporalContext(state);
  const semanticObservation = {
    action: 'PRAYER',
    mode: 'REFLECTION',
    confidence: 0.9,
    intention: { label: 'GOOD', rgbl: { R: 0.1, G: 0.8, B: 0.7, L: 0.4 } },
    actionGateVector: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
    impactVector: Array(13).fill(0.1),
    timeFactor: context,
    evidence: [{ type: 'Q', reference: '73:20' }],
    status: 'INFERRED'
  };

  const result = buildAiAnalysis('prayer at reference time', { semanticObservation });
  assert.equal(result.mizan?.timeFactor?.schema, 'MIZAN_TEMPORAL_CONTEXT_V1');
  assert.equal(result.mizan?.timeFactor?.signals?.finalThird, true);
  assert.equal(result.mizan?.timeFactor?.safeguards?.scoreIsNotDivineReward, true);
});

test('TSE fails closed when Fajr is required but not supplied', () => {
  assert.throws(() => calculateTemporalState({
    timestamp,
    location,
    activity: { type: 'PRAYER' },
    nightModel: 'SUNSET_TO_FAJR'
  }), /TSE_FAJR_REQUIRED_FOR_SUNSET_TO_FAJR/);
});

test('TSE rejects invalid coordinates and IANA timezone identifiers', () => {
  assert.throws(() => calculateTemporalState({
    timestamp,
    location: { latitude: 91, longitude: 107, timezone: 'Asia/Jakarta' },
    nightModel: 'SUNSET_TO_SUNRISE'
  }), /TSE_LATITUDE_INVALID/);
  assert.throws(() => calculateTemporalState({
    timestamp,
    location: { latitude: -6, longitude: 107, timezone: 'Not/An_IANA_Zone' },
    nightModel: 'SUNSET_TO_SUNRISE'
  }), /TSE_TIMEZONE_INVALID/);
});

test('TSE records provider conventions and keeps polar no-event states explicit', () => {
  const polar = calculateTemporalState({
    timestamp: '2026-06-21T12:00:00Z',
    location: { name: 'Tromsø', latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo' },
    nightModel: 'SUNSET_TO_SUNRISE',
  });

  assert.equal(polar.provenance.provider, 'astronomy-engine');
  assert.equal(polar.provenance.calculationConvention.canonicalTime, 'UTC');
  assert.equal(polar.provenance.calculationConvention.horizonRefraction, 'normal');
  assert.equal(polar.provenance.providerCapabilities.sunRiseSet, true);
  assert.equal(polar.solar.sunrise.status, 'UNRESOLVED');
  assert.equal(polar.solar.sunset.status, 'UNRESOLVED');
  assert.equal(polar.solar.sunrise.utc, null);
  assert.equal(polar.scoring.astronomicalDataStatus, 'UNRESOLVED');
  assert.equal(polar.scoring.confidenceAdjustedScore, null);
  assert.ok(polar.scoring.dataQuality < 1);
});
