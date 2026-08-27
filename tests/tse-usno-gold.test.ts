// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTemporalState } from '../packages/tse-engine/src/index.ts';

const GOLD = [
  {
    id: 'USNO-WASHINGTON-2026-08-28',
    location: { name: 'Washington, DC', latitude: 38.89, longitude: -77.03, timezone: 'America/New_York' },
    timestamp: '2026-08-28T12:00:00-04:00',
    sunriseLocal: '07:34',
    sunsetLocal: '20:44',
    toleranceMinutes: 2,
  },
  {
    id: 'USNO-SEATTLE-2026-08-28',
    location: { name: 'Seattle, WA', latitude: 47.63, longitude: -122.33, timezone: 'America/Los_Angeles' },
    timestamp: '2026-08-28T12:00:00-07:00',
    sunriseLocal: '07:23',
    sunsetLocal: '20:57',
    toleranceMinutes: 2,
  },
];

function expectedUtc(local: string, date: string, offsetMinutes: number): Date {
  const [h, m] = local.split(':').map(Number);
  return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), h, m) - offsetMinutes * 60000);
}

function diffMinutes(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60000;
}

test('TSE rise/set outputs match independent USNO gold vectors', () => {
  // USNO annual tables use standard time and explicitly say to add one hour when daylight time is in use.
  const offsetByCase = {
    'USNO-WASHINGTON-2026-08-28': -240,
    'USNO-SEATTLE-2026-08-28': -420,
  };

  for (const gold of GOLD) {
    const state = calculateTemporalState({
      timestamp: gold.timestamp,
      location: gold.location,
      nightModel: 'SUNSET_TO_SUNRISE',
    });

    assert.ok(state.solar.sunriseUtc, `${gold.id}: missing sunrise`);
    assert.ok(state.solar.sunsetUtc, `${gold.id}: missing sunset`);

    const expectedRise = expectedUtc(gold.sunriseLocal, gold.timestamp.slice(0, 10), offsetByCase[gold.id]);
    const expectedSet = expectedUtc(gold.sunsetLocal, gold.timestamp.slice(0, 10), offsetByCase[gold.id]);

    assert.ok(
      diffMinutes(new Date(state.solar.sunriseUtc), expectedRise) <= gold.toleranceMinutes,
      `${gold.id}: sunrise differs by more than ${gold.toleranceMinutes} minutes`,
    );
    assert.ok(
      diffMinutes(new Date(state.solar.sunsetUtc), expectedSet) <= gold.toleranceMinutes,
      `${gold.id}: sunset differs by more than ${gold.toleranceMinutes} minutes`,
    );
  }
});
