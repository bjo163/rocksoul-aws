import assert from 'node:assert/strict';
import { buildRevelationGraph } from '../src/revelation-graph.js';

const input = {
  prophets: [{ id: 'ADAM', quranReferences: ['Q2:30-39'] }],
  scriptureReferences: [{
    id: 'QREF-ADAM-Q2_30_39',
    bookId: 'BOOK-QURAN',
    reference: 'Q2:30-39',
    subjectId: 'ADAM',
    surah: 2,
    passageStart: 30,
    passageEnd: 39,
    grounding: 'QURAN_EXPLICIT',
  }],
  events: [{
    id: 'EVENT-ADAM-CREATION',
    prophetId: 'ADAM',
    quranReferences: ['Q2:30-39'],
    grounding: 'QURAN_EXPLICIT',
  }],
};

const graph = buildRevelationGraph(input);
const graphAgain = buildRevelationGraph(input);

assert.equal(graph.protocol, 'REVELATION_GRAPH_V1');
assert.deepEqual(graph, graphAgain);

assert.ok(graph.nodes.some((node) => node.id === 'BOOK-QURAN' && node.kind === 'BOOK' && node.lane === 'CORE'));
assert.ok(graph.nodes.some((node) => node.id === 'QURAN:SURAH:2' && node.kind === 'SURAH' && node.lane === 'CORE'));
assert.ok(graph.nodes.some((node) => node.id === 'QURAN:2:30-39' && node.kind === 'PASSAGE' && node.lane === 'CORE'));
assert.ok(graph.nodes.some((node) => node.id === 'ADAM' && node.kind === 'PROPHET_REFERENCE' && node.lane === 'CORE'));
assert.ok(graph.nodes.some((node) => node.id === 'EVENT-ADAM-CREATION' && node.kind === 'PROPHETIC_EVENT' && node.lane === 'CORE'));

for (const relation of graph.relations) {
  assert.notEqual(relation.lane, 'UNRESOLVED');
  if (relation.relation === 'PASSAGE_REFERENCES_PROPHET') assert.equal(relation.grounding, 'QURAN_EXPLICIT');
  if (relation.relation === 'EVENT_ATTESTED_BY_PASSAGE') assert.equal(relation.grounding, 'QURAN_EXPLICIT');
}

const relationIds = graph.relations.map((relation) => relation.id);
assert.equal(new Set(relationIds).size, relationIds.length);

const unresolved = buildRevelationGraph({
  prophets: [{ id: 'UNKNOWN_PROPHET', quranReferences: [] }],
  scriptureReferences: [{ id: 'REF-UNKNOWN', bookId: 'UNKNOWN', reference: 'unknown', subjectId: 'UNKNOWN_PROPHET', grounding: 'UNRESOLVED' }],
  events: [{ id: 'EVENT-UNKNOWN', prophetId: 'UNKNOWN_PROPHET', quranReferences: [], grounding: 'UNRESOLVED' }],
});

assert.ok(unresolved.nodes.some((node) => node.id === 'EVENT-UNKNOWN' && node.lane === 'UNRESOLVED'));
assert.ok(unresolved.relations.some((relation) => relation.id.includes('PROPHET_HAS_EVENT') && relation.lane === 'UNRESOLVED' && relation.grounding === 'UNRESOLVED'));
assert.equal(unresolved.boundaries.unresolvedPromotedToCore, false);
assert.equal(unresolved.boundaries.inferredChronology, false);
assert.equal(unresolved.boundaries.prophetBecomesDivineOntology, false);
assert.equal(unresolved.boundaries.nonScripturalEvidencePromoted, false);
