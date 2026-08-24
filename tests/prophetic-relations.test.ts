import test from 'node:test';
import assert from 'node:assert/strict';
import { propheticRelationsSnapshot } from '../src/revelation/prophetic-relations.js';

test('prophetic relations are anchored to admitted Revelation evidence', () => {
  const snapshot = propheticRelationsSnapshot();
  assert.equal(snapshot.protocol, 'REVELATION_PROPHETIC_RELATIONS_V1');
  assert.ok(snapshot.counts.prophets > 0);
  assert.ok(snapshot.counts.scriptureReferences > 0);
  assert.ok(snapshot.counts.propheticEvents > 0);
  assert.ok(snapshot.relations.some((item) => item.relation === 'SCRIPTURE_ATTESTS_PROPHET' && item.grounding === 'QURAN_EXPLICIT'));
  assert.ok(snapshot.relations.some((item) => item.relation === 'PROPHET_HAS_EVENT' && item.lane === 'CORE'));
});

test('prophetic relation boundaries do not promote derived or unresolved data', () => {
  const snapshot = propheticRelationsSnapshot();
  assert.equal(snapshot.boundaries.historicalChronologyInferred, false);
  assert.equal(snapshot.boundaries.externalProphetSourcesUsed, false);
  assert.equal(snapshot.boundaries.prophetBecomesDivineOntology, false);
  assert.equal(snapshot.boundaries.unresolvedRelationsPromotedToCore, false);
  for (const relation of snapshot.relations) {
    if (relation.grounding === 'QURAN_EXPLICIT') assert.equal(relation.lane, 'CORE');
    if (relation.grounding === 'UNRESOLVED') assert.equal(relation.lane, 'UNRESOLVED');
  }
});
