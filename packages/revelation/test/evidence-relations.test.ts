import assert from 'node:assert/strict';
import { buildExplicitEvidenceRelations } from '../src/evidence-relations.js';

const relations = buildExplicitEvidenceRelations([
  { evidenceId: 'EV-Q', targetId: 'QURAN:2:30-39', targetKind: 'PASSAGE', evidenceClass: 'QURAN_EXPLICIT', grounding: 'EXPLICIT', provenance: 'CANONICAL_RECORD' },
  { evidenceId: 'EV-Q', targetId: 'ADAM', targetKind: 'PROPHET_REFERENCE', evidenceClass: 'QURAN_EXPLICIT', grounding: 'EXPLICIT', provenance: 'CANONICAL_RECORD' },
  { evidenceId: 'EV-W', targetId: 'EVENT-ADAM-CREATION', targetKind: 'PROPHETIC_EVENT', evidenceClass: 'TEXTUAL_WITNESS_CORROBORATION', grounding: 'CORROBORATIVE', provenance: 'CANONICAL_RECORD' },
  { evidenceId: 'EV-O', targetId: 'EVENT-ADAM-CREATION', targetKind: 'PROPHETIC_EVENT', evidenceClass: 'OBSERVED', grounding: 'OBSERVED', provenance: 'RUNTIME_OBSERVATION' },
  { evidenceId: 'EV-I', targetId: 'EVENT-ADAM-CREATION', targetKind: 'PROPHETIC_EVENT', evidenceClass: 'AI_INFERENCE', grounding: 'DERIVED', provenance: 'DERIVED_ENGINE' },
  { evidenceId: 'EV-C', targetId: 'EVENT-ADAM-CREATION', targetKind: 'PROPHETIC_EVENT', evidenceClass: 'CONFLICTED', grounding: 'CONFLICTED', provenance: 'CANONICAL_RECORD' },
]);

assert.equal(relations.length, 6);
assert.ok(relations.some((item) => item.relation === 'EVIDENCE_SUPPORTS_PASSAGE'));
assert.ok(relations.some((item) => item.relation === 'EVIDENCE_SUPPORTS_PROPHET_REFERENCE'));
assert.ok(relations.some((item) => item.relation === 'EVIDENCE_CORROBORATES_EVENT'));
assert.ok(relations.some((item) => item.relation === 'EVIDENCE_OBSERVES_EVENT'));
assert.ok(relations.some((item) => item.relation === 'EVIDENCE_DERIVED_FROM_EVENT'));
assert.ok(relations.some((item) => item.relation === 'EVIDENCE_CONFLICTS_WITH_EVENT'));

const explicit = relations.find((item) => item.relation === 'EVIDENCE_SUPPORTS_PASSAGE');
assert.equal(explicit?.grounding, 'EXPLICIT');
assert.equal(explicit?.provenance, 'CANONICAL_RECORD');

const unresolved = buildExplicitEvidenceRelations([
  { evidenceId: 'EV-U', targetId: 'EVENT-UNKNOWN', targetKind: 'PROPHETIC_EVENT', evidenceClass: 'UNKNOWN', grounding: 'UNKNOWN', provenance: 'UNKNOWN' },
]);
assert.deepEqual(unresolved, []);

const unsupportedTarget = buildExplicitEvidenceRelations([
  { evidenceId: 'EV-X', targetId: 'CASE-1', targetKind: 'CASE', evidenceClass: 'QURAN_EXPLICIT', grounding: 'EXPLICIT', provenance: 'CANONICAL_RECORD' },
]);
assert.deepEqual(unsupportedTarget, []);

const duplicate = buildExplicitEvidenceRelations([
  { evidenceId: 'EV-Q', targetId: 'ADAM', targetKind: 'PROPHET_REFERENCE', evidenceClass: 'QURAN_EXPLICIT', grounding: 'EXPLICIT', provenance: 'CANONICAL_RECORD' },
  { evidenceId: 'EV-Q', targetId: 'ADAM', targetKind: 'PROPHET_REFERENCE', evidenceClass: 'QURAN_EXPLICIT', grounding: 'EXPLICIT', provenance: 'CANONICAL_RECORD' },
]);
assert.equal(duplicate.length, 1);
