import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceHistory, validateEvidenceHistory } from '../packages/revelation/src/evidence-history.js';

test('evidence history is immutable, versioned and deterministic', () => {
  const entries = buildEvidenceHistory([
    { evidenceId: 'E2', entityId: 'CASE-1', version: 2, status: 'VERIFIED', supersedes: 'E1', supersessionReason: 'new source', createdAt: '2026-08-23T00:00:00.000Z' },
    { evidenceId: 'E1', entityId: 'CASE-1', version: 1, status: 'OBSERVED', createdAt: '2026-08-22T00:00:00.000Z' },
  ]);
  assert.deepEqual(entries.map((entry) => entry.id), [
    'EHIST-CASE-1-E1-v1',
    'EHIST-CASE-1-E2-v2',
  ]);
  assert.equal(entries[1].supersedes, 'E1');
  assert.equal(entries[1].immutable, true);
  assert.deepEqual(validateEvidenceHistory(entries), []);
});

test('invalid self-supersession is rejected without deleting history', () => {
  const entries = buildEvidenceHistory([{ evidenceId: 'E1', entityId: 'CASE-1', version: 1, supersedes: 'E1' }]);
  assert.deepEqual(validateEvidenceHistory(entries), ['self-supersession: EHIST-CASE-1-E1-v1']);
  assert.equal(entries.length, 1);
});

test('missing ids are ignored rather than fabricating a historical record', () => {
  assert.deepEqual(buildEvidenceHistory([{ evidenceId: '', entityId: 'CASE-1' }, { evidenceId: 'E2', entityId: '' }]), []);
});
