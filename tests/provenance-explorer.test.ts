import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProvenanceTrace } from '../packages/revelation/src/provenance-explorer.js';

test('provenance trace is deterministic and preserves unresolved state', () => {
  const trace = buildProvenanceTrace({
    root: { id: 'EVENT-1', title: 'Creation', reference: 'Q2:30', epistemicLane: 'CORE', sourceClass: 'REVELATION', provenance: 'DATASET_CANONICAL' },
    references: [{ id: 'REF-1', reference: 'Q2:30', eventId: 'EVENT-1', grounding: 'EXPLICIT', sourceClass: 'REVELATION', provenance: 'DATASET_CANONICAL' }],
    evidence: [{ evidenceId: 'E-1', entityId: 'EVENT-1', reference: 'Q2:30', evidenceClass: 'QURAN_EXPLICIT', grounding: 'EXPLICIT', provenance: 'CANONICAL_RECORD' }],
    reviews: [{ reviewId: 'R-1', targetId: 'EVENT-1', status: 'QUEUED' }],
    witness: { id: 'W-1', state: 'VALID', valid: true },
    audit: [{ auditId: 'A-1', entityId: 'EVENT-1', action: 'OBSERVED' }],
  });

  assert.equal(trace.protocol, 'CAB_PROVENANCE_TRACE_V1');
  assert.equal(trace.rootId, 'EVENT-1');
  assert.equal(trace.terminalState, 'GROUNDED');
  assert.ok(trace.nodes.some((node) => node.kind === 'REFERENCE' && node.id === 'REF-1'));
  assert.ok(trace.nodes.some((node) => node.kind === 'EVIDENCE' && node.id === 'E-1'));
  assert.ok(trace.nodes.some((node) => node.kind === 'REVIEW' && node.id === 'R-1'));
  assert.ok(trace.nodes.some((node) => node.kind === 'WITNESS' && node.id === 'W-1'));
  assert.ok(trace.nodes.some((node) => node.kind === 'AUDIT' && node.id === 'A-1'));
});

test('provenance trace never turns missing grounding into core', () => {
  const trace = buildProvenanceTrace({
    root: { id: 'EVENT-U', title: 'Unknown event' },
    evidence: [{ evidenceId: 'E-U', entityId: 'EVENT-U', evidenceClass: 'UNKNOWN', grounding: 'UNKNOWN' }],
  });

  assert.equal(trace.nodes.find((node) => node.id === 'E-U')?.lane, 'UNRESOLVED');
  assert.equal(trace.terminalState, 'UNRESOLVED');
});
