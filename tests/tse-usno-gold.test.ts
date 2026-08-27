// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTemporalState } from '../packages/tse-engine/src/index.ts';

const GOLD = [
  {
    id: 'USNO-WASHINGTON-2026-08-28',
    location: { name: 'Washington, DC', latitude: 38.89, longitude: -77.03, timezone: 'America/New_York' },
    timestamp: '2026-08-28T12:00:00-04:00',
    sunriseLocal: '06:34',
    sunsetLocal: '19:44',
    toleranceMinutes: 3,
  },
  {
    id: 'USNO-SEATTLE-2026-08-28',
    location: { name: 'Seattle, WA', latitude: 47.63, longitude: -122.33, timezone: 'America/Los_Angeles' },
    timestamp: '2026-08-28T12:00:00-07:00',
    sunriseLocal: '06:22',
    sunsetLocal: '19:57',
    toleranceMinutes: 3,
  },
];

function localTimeOf(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function minutesSinceMidnight(local: string): number {
  const [h, m] = local.split(':').map(Number);
  return h * 60 + m;
}

function diffMinutes(a: string, b: string): number {
  return Math.abs(minutesSinceMidnight(a) - minutesSinceMidnight(b));
}

test('TSE rise/set outputs match independent USNO gold vectors', () => {
  // USNO annual tables are published in standard time and explicitly instruct adding one hour where daylight time applies.
  // Gold values below are the resulting civil-local times. Comparison is performed entirely in the same IANA timezone,
  // avoiding manual UTC-offset arithmetic in the fixture.
  for (const gold of GOLD) {
    const state = calculateTemporalState({
      timestamp: gold.timestamp,
      location: gold.location,
      nightModel: 'SUNSET_TO_SUNRISE',
    });

    assert.ok(state.solar.sunriseUtc, `${gold.id}: missing sunrise`);
    assert.ok(state.solar.sunsetUtc, `${gold.id}: missing sunset`);

    const actualRise = localTimeOf(new Date(state.solar.sunriseUtc), gold.location.timezone);
    const actualSet = localTimeOf(new Date(state.solar.sunsetUtc), gold.location.timezone);
    const riseDiff = diffMinutes(actualRise, gold.sunriseLocal);
    const setDiff = diffMinutes(actualSet, gold.sunsetLocal);

    assert.ok(
      riseDiff <= gold.toleranceMinutes,
      `${gold.id}: sunrise local=${actualRise}, expected=${gold.sunriseLocal}, delta=${riseDiff.toFixed(3)} min > ${gold.toleranceMinutes} min`,
    );
    assert.ok(
      setDiff <= gold.toleranceMinutes,
      `${gold.id}: sunset local=${actualSet}, expected=${gold.sunsetLocal}, delta=${setDiff.toFixed(3)} min > ${gold.toleranceMinutes} min`,
    );
  }
});
