import assert from 'node:assert/strict';
import { bindEvidenceToRevelationGraph } from '../src/evidence-graph.js';

const graph = {
  nodes: [
    { id: 'BOOK-QURAN', kind: 'BOOK', lane: 'CORE' },
    { id: 'QURAN:SURAH:2', kind: 'SURAH', lane: 'CORE' },
    { id: 'QURAN:2:30-39', kind: 'PASSAGE', lane: 'CORE' },
    { id: 'ADAM', kind: 'PROPHET_REFERENCE', lane: 'CORE' },
  ],
  relations: [
    {
      id: 'RGRAPH-PASSAGE_REFERENCES_PROPHET-QURAN:2:30-39-ADAM',
      relation: 'PASSAGE_REFERENCES_PROPHET',
      fromId: 'QURAN:2:30-39',
      toId: 'ADAM',
      lane: 'CORE',
      grounding: 'QURAN_EXPLICIT',
    },
  ],
};

const bindings = bindEvidenceToRevelationGraph({
  graph,
  evidence: [
    {
      evidenceId: 'E-QURAN-1', entityId: 'ADAM', sourceType: 'DOCUMENT', reference: 'Q2:30-39',
      status: 'VERIFIED', class: 'QURAN_EXPLICIT', grounding: 'EXPLICIT', normativeAuthority: true,
      originalRevelationEquated: false, provenance: 'CANONICAL_RECORD', superseded: false,
    },
    {
      evidenceId: 'E-OBS-1', entityId: 'ADAM', sourceType: 'PHOTO_VIDEO', reference: 'Q2:30-39',
      status: 'OBSERVED', class: 'OBSERVED', grounding: 'OBSERVED', normativeAuthority: false,
      originalRevelationEquated: false, provenance: 'RUNTIME_OBSERVATION', superseded: false,
    },
    {
      evidenceId: 'E-CORR-1', entityId: 'ADAM', sourceType: 'TESTIMONY', reference: 'Q2:30-39',
      status: 'CORROBORATED', class: 'TEXTUAL_WITNESS_CORROBORATION', grounding: 'CORROBORATIVE', normativeAuthority: false,
      originalRevelationEquated: false, provenance: 'CANONICAL_RECORD', superseded: false,
    },
  ],
});

assert.equal(bindings.length, 3);
assert.deepEqual(bindings.map((item) => item.relation), [
  'EVIDENCE_SUPPORTS',
  'EVIDENCE_CORROBORATES',
  'EVIDENCE_OBSERVES',
]);

const explicit = bindings.find((item) => item.evidenceId === 'E-QURAN-1');
assert.equal(explicit?.targetId, 'QURAN:2:30-39');
assert.equal(explicit?.lane, 'CORE');
assert.equal(explicit?.grounding, 'QURAN_EXPLICIT');
assert.equal(explicit?.normativeAuthority, true);

const corroborative = bindings.find((item) => item.evidenceId === 'E-CORR-1');
assert.equal(corroborative?.grounding, 'UNRESOLVED');
assert.equal(corroborative?.normativeAuthority, false);

const observation = bindings.find((item) => item.evidenceId === 'E-OBS-1');
assert.equal(observation?.grounding, 'UNRESOLVED');
assert.equal(observation?.normativeAuthority, false);

const unsupported = bindEvidenceToRevelationGraph({
  graph,
  evidence: [{
    evidenceId: 'E-UNKNOWN', entityId: 'ADAM', sourceType: 'USER_SUBMITTED', reference: 'Q99:99-100',
    status: 'SUPPORTED', class: 'UNKNOWN', grounding: 'UNKNOWN', normativeAuthority: false,
    originalRevelationEquated: false, provenance: 'UNKNOWN', superseded: false,
  }],
});
assert.deepEqual(unsupported, []);
