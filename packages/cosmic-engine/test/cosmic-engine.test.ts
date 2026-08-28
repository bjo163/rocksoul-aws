import assert from 'node:assert/strict';
import test from 'node:test';
import { createCosmicEngine, createProvenanceAuditPackage, serializeProvenanceAuditPackage, toCosmicSemanticObservation, verifyProvenanceAuditPackage } from '../src/index.js';

test('Cosmic facade is deterministic and host-neutral', async () => {
  const engine = createCosmicEngine();
  const first = await engine.analyzeSemantic('ambiguous input');
  const second = await engine.analyzeSemantic('ambiguous input');
  assert.deepEqual(first, second);
  assert.equal(first.protocol, 'COSMIC_SEMANTIC_OBSERVATION_V1');
  assert.equal(first.status, 'AVAILABLE');
  assert.ok(Array.isArray(first.candidates));
});

test('Cosmic facade keeps provider observations non-authoritative', () => {
  const result = toCosmicSemanticObservation({
    status: 'INFERRED',
    actionCandidates: [{ action: 'REVIEW', score: 2, matchedAlias: 'review' }],
    epistemicSignals: { intentional: true },
  });
  assert.equal(result.candidates[0]?.confidence, 1);
  assert.deepEqual(result.intentionSignals, ['DECLARED_INTENT_SIGNAL']);
  assert.match(result.diagnostics[0], /non-authoritative/);
});

test('Cosmic facade exposes bounded Mizan evaluation', () => {
  const engine = createCosmicEngine();
  const result = engine.evaluateMizan({ semantic: { R: 1, G: 0, B: 0, L: 0 } });
  assert.equal(result.modelOnly, true);
  assert.ok(Number.isFinite(result.raw));
  assert.ok(result.raw >= 0 && result.raw <= 100);
});

test('provenance audit package is deterministic, verifiable, and secret-safe', () => {
  const input = { subject: { id: 'CASE-1', type: 'CASE' }, release: { version: '4.33.0', revision: 'abc123' }, records: [{ id: 'E-1', status: 'VERIFIED' }], provenance: { sources: ['Q5:8'] } };
  const first = createProvenanceAuditPackage(input);
  const second = createProvenanceAuditPackage({ ...input, provenance: { sources: ['Q5:8'] } });
  assert.equal(serializeProvenanceAuditPackage(first), serializeProvenanceAuditPackage(second));
  assert.equal(verifyProvenanceAuditPackage(first), true);
  assert.equal(verifyProvenanceAuditPackage({ ...first, records: [] }), false);
  assert.throws(() => createProvenanceAuditPackage({ ...input, records: [{ privateKey: 'never-export' }] }), /AUDIT_EXPORT_SECRET_FIELD_FORBIDDEN/);
});
