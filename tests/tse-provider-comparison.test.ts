import assert from 'node:assert/strict';
import test from 'node:test';
import {
  astronomyEngineProvider,
  compareTemporalProviders,
  type EphemerisProvider,
} from '../packages/tse-engine/src/index.ts';

/** Independent static adapter used only to exercise the provider protocol. */
const deterministicReferenceProvider: EphemerisProvider = {
  id: 'deterministic-reference-fixture',
  version: '1.0.0',
  algorithmVersion: 'fixed-reference-v1',
  confidence: 1,
  capabilities: { sunPosition: true, moonPosition: true, sunRiseSet: true, moonRiseSet: true, lunarIllumination: true, altitudeCrossing: true },
  position(body) {
    return body === 'SUN' ? { altitudeDeg: 31.25, azimuthDeg: 145.5 } : { altitudeDeg: -12.75, azimuthDeg: 234.5 };
  },
  riseSet(body, _location, direction) {
    if (body === 'SUN') return new Date(direction === 1 ? '2026-08-28T06:00:00.000Z' : '2026-08-28T18:00:00.000Z');
    return new Date(direction === 1 ? '2026-08-28T20:00:00.000Z' : '2026-08-28T08:00:00.000Z');
  },
  altitudeCrossing(_body, _location, direction) {
    return new Date(direction === 1 ? '2026-08-28T09:00:00.000Z' : '2026-08-28T15:00:00.000Z');
  },
  lunarIllumination() { return { phaseAngleDeg: 100, elongationDeg: 110 }; },
};

const input = {
  timestamp: '2026-08-28T12:00:00.000Z',
  location: { latitude: 0, longitude: 0, timezone: 'UTC' },
  nightModel: 'SUNSET_TO_SUNRISE' as const,
};

test('TSE compares independent provider adapters without changing provider-local scoring', () => {
  const comparison = compareTemporalProviders(input, [astronomyEngineProvider, deterministicReferenceProvider]);
  const repeat = compareTemporalProviders(input, [astronomyEngineProvider, deterministicReferenceProvider]);

  assert.deepEqual(comparison, repeat);
  assert.equal(comparison.length, 2);
  assert.equal(comparison[0].provider.provider, 'astronomy-engine');
  assert.equal(comparison[0].relativeToBaseline.sunriseDeltaSeconds, 0);
  assert.equal(comparison[1].provider.provider, 'deterministic-reference-fixture');
  assert.equal(comparison[1].provider.algorithmVersion, 'fixed-reference-v1');
  assert.equal(comparison[1].state.provenance.provider, 'deterministic-reference-fixture');
  assert.equal(comparison[1].state.scoring.activityIndependent, true);
  assert.equal(comparison[1].state.solar.altitudeDeg, 31.25);
  assert.equal(typeof comparison[1].relativeToBaseline.solarAltitudeDeltaDeg, 'number');
  assert.equal(typeof comparison[1].relativeToBaseline.sunriseDeltaSeconds, 'number');
});

test('TSE requires at least two providers for a cross-provider comparison', () => {
  assert.throws(() => compareTemporalProviders(input, [astronomyEngineProvider]), /TSE_PROVIDER_COMPARISON_REQUIRES_TWO_PROVIDERS/);
});
