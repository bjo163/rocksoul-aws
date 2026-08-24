import assert from 'node:assert/strict';
import { buildUniverseProjection } from '../src/universe-projection.js';

const input = {
  entities: [{ id: 'ENTITY-1' }],
  relations: [{ id: 'REL-1' }],
  events: [{ id: 'EVENT-1' }],
  evidence: [
    { evidenceId: 'E1', status: 'VERIFIED' },
    { evidenceId: 'E2', status: 'CONFLICTED' },
    { evidenceId: 'E3', status: 'OBSERVED', supersededBy: 'E4' },
  ],
  cases: [
    { id: 'CASE-1', status: 'REVIEW_REQUIRED', witnessState: 'PENDING' },
    { id: 'CASE-2', status: 'OPEN', witnessState: 'VALID' },
  ],
  graph: {
    nodes: [{ id: 'BOOK-QURAN' }, { id: 'ADAM' }],
    relations: [{ id: 'R1' }],
    lanes: { core: 1, derived: 0, unresolved: 0 },
  },
};

const projection = buildUniverseProjection(input);
assert.equal(projection.protocol, 'CAB_UNIVERSE_READ_V1');
assert.deepEqual(projection.world, { entityCount: 1, relationCount: 1, eventCount: 1, caseCount: 2 });
assert.deepEqual(projection.revelation, { nodeCount: 2, relationCount: 1, lanes: { core: 1, derived: 0, unresolved: 0 } });
assert.deepEqual(projection.knowledge, { evidenceCount: 3, verifiedCount: 1, conflictedCount: 1, supersededCount: 1 });
assert.deepEqual(projection.governance, { reviewableCaseCount: 1, witnessPendingCount: 1 });
