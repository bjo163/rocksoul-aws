import assert from 'node:assert/strict';
import test from 'node:test';
import { compareTime, makeTimeEvent } from '../src/index.js';

test('makeTimeEvent produces a normalized instant by default', () => {
  const event = makeTimeEvent({ occurredAt: '2026-08-28T00:00:00.000Z' });
  assert.deepEqual(event, {
    occurredAt: '2026-08-28T00:00:00.000Z',
    calendar: 'ISO_GREGORIAN',
    eraId: 'CURRENT',
    duration: null,
    temporalScope: 'INSTANT'
  });
});

test('compareTime compares ISO timestamps chronologically', () => {
  assert.equal(compareTime('2026-01-01T00:00:01.000Z', '2026-01-01T00:00:00.000Z'), 1000);
});
