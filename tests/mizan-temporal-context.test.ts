import assert from 'node:assert/strict';
import test from 'node:test';

import { isMizanTemporalContext } from '../src/contracts/mizan.ts';

test('Mizan temporal context requires provenance and non-theological safeguards', () => {
  const context = {
    schema: 'MIZAN_TEMPORAL_CONTEXT_V1', timestampUtc: '2026-08-28T00:00:00.000Z', location: {}, temporalState: {}, signals: {}, provenance: {},
    safeguards: { scoreIsNotDivineReward: true, activityIndependent: true, hypothesesAreNotRevealedRules: true },
  };
  assert.equal(isMizanTemporalContext(context), true);
  assert.equal(isMizanTemporalContext({ ...context, safeguards: { ...context.safeguards, activityIndependent: false } }), false);
});
