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
    toleranceMinutes: 3,
  },
  {
    id: 'USNO-SEATTLE-2026-08-28',
    location: { name: 'Seattle, WA', latitude: 47.63, longitude: -122.33, timezone: 'America/Los_Angeles' },
    timestamp: '2026-08-28T12:00:00-07:00',
    sunriseLocal: '07:23',
    sunsetLocal: '20:57',
    toleranceMinutes: 3,
  },
];

function localHM(iso, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;
  return `${hour}:${minute}`;
}

function diffMinutesLocal(actualIso, expectedLocal, date, timezone) {
  const [eh, em] = expectedLocal.split(':').map(Number);
  const actualParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(actualIso));
  const get = (type) => Number(actualParts.find((p) => p.type === type)?.value);
  const actualMinutes = get('hour') * 60 + get('minute') + get('second') / 60;
  const expectedMinutes = eh * 60 + em;
  let delta = Math.abs(actualMinutes - expectedMinutes);
  if (delta > 720) delta = 1440 - delta;
  return delta;
}

test('TSE rise/set outputs match independent USNO gold vectors', () => {
  for (const gold of GOLD) {
    const state = calculateTemporalState({
      timestamp: gold.timestamp,
      location: gold.location,
      nightModel: 'SUNSET_TO_SUNRISE',
    });

    assert.ok(state.solar.sunriseUtc, `${gold.id}: missing sunrise`);
    assert.ok(state.solar.sunsetUtc, `${gold.id}: missing sunset`);

    const riseLocal = localHM(state.solar.sunriseUtc, gold.location.timezone);
    const setLocal = localHM(state.solar.sunsetUtc, gold.location.timezone);
    const riseDiff = diffMinutesLocal(state.solar.sunriseUtc, gold.sunriseLocal, gold.timestamp.slice(0, 10), gold.location.timezone);
    const setDiff = diffMinutesLocal(state.solar.sunsetUtc, gold.sunsetLocal, gold.timestamp.slice(0, 10), gold.location.timezone);

    assert.ok(
      riseDiff <= gold.toleranceMinutes,
      `${gold.id}: sunrise local=${riseLocal}, expected=${gold.sunriseLocal}, delta=${riseDiff.toFixed(3)} min > ${gold.toleranceMinutes} min`,
    );
    assert.ok(
      setDiff <= gold.toleranceMinutes,
      `${gold.id}: sunset local=${setLocal}, expected=${gold.sunsetLocal}, delta=${setDiff.toFixed(3)} min > ${gold.toleranceMinutes} min`,
    );
  }
});
