import assert from 'node:assert/strict';
import { resolveEventConflicts } from '../src/events/conflict-resolution.js';

function event(eventId: string, direction: 'POSITIVE' | 'NEGATIVE', sequence: number, restoration = false): any {
  return {
    eventId,
    sequence,
    action: direction === 'NEGATIVE' ? 'LYING' : restoration ? 'RESTITUTION' : 'HELPING_GOOD',
    restoration,
    binding: { pureNormativeDerivation: true, direction, references: [`Q${sequence}:1`] }
  };
}

const actual = resolveEventConflicts([event('E1', 'NEGATIVE', 1), event('E1', 'POSITIVE', 1)]);
assert.equal(actual.state, 'ACTUAL_CONFLICT');
assert.equal(actual.blockingMizan, true);
assert.equal(actual.normativePriorityApplied, false);

const restored = resolveEventConflicts([event('E1', 'NEGATIVE', 1), event('E2', 'POSITIVE', 2, true)]);
assert.equal(restored.state, 'SEQUENCE_RESOLVED');
assert.equal(restored.blockingMizan, false);
assert.equal(restored.requiresHumanReview, true);

const clean = resolveEventConflicts([event('E1', 'POSITIVE', 1)]);
assert.equal(clean.state, 'NONE');
assert.equal(clean.blockingMizan, false);

const unknown = resolveEventConflicts([]);
assert.equal(unknown.state, 'INSUFFICIENT_EVIDENCE');
assert.equal(unknown.requiresHumanReview, true);

console.log(JSON.stringify({ ok: true, cases: 4, protocol: actual.protocol }));
