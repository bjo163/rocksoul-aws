import assert from 'node:assert/strict';
import { buildEvidenceConflictGraph } from '../src/evidence-conflicts.js';

const graph = buildEvidenceConflictGraph([
  { evidenceId: 'Q1', class: 'QURAN_EXPLICIT', grounding: 'EXPLICIT', reference: 'Q2:30-39' },
  { evidenceId: 'W1', class: 'TEXTUAL_WITNESS_CORROBORATION', grounding: 'CORROBORATIVE', reference: 'Q2:30-39' },
  { evidenceId: 'C1', class: 'CONFLICTED', grounding: 'CONFLICTED', reference: 'Q2:30-39' },
  { evidenceId: 'OLD', class: 'CONFLICTED', grounding: 'CONFLICTED', reference: 'Q2:30-39', superseded: true },
]);

assert.equal(graph.length, 3);
assert.ok(graph.some((item) => item.relation === 'CORROBORATES' && item.fromEvidenceId === 'Q1' && item.toEvidenceId === 'W1'));
assert.ok(graph.some((item) => item.relation === 'CONFLICTS_WITH' && item.fromEvidenceId === 'C1' && item.toEvidenceId === 'Q1'));
assert.ok(graph.every((item) => item.symmetric === true));
assert.equal(new Set(graph.map((item) => item.id)).size, graph.length);

const rebuilt = buildEvidenceConflictGraph([
  { evidenceId: 'W1', class: 'TEXTUAL_WITNESS_CORROBORATION', grounding: 'CORROBORATIVE', reference: 'Q2:30-39' },
  { evidenceId: 'Q1', class: 'QURAN_EXPLICIT', grounding: 'EXPLICIT', reference: 'Q2:30-39' },
  { evidenceId: 'C1', class: 'CONFLICTED', grounding: 'CONFLICTED', reference: 'Q2:30-39' },
]);
assert.deepEqual(graph, rebuilt);

assert.deepEqual(buildEvidenceConflictGraph([
  { evidenceId: 'A', class: 'OBSERVED', grounding: 'OBSERVED', reference: 'Q2:30-39' },
  { evidenceId: 'B', class: 'AI_INFERENCE', grounding: 'DERIVED', reference: 'Q2:30-39' },
]), []);
