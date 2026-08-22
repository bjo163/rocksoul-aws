import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStructuralStoryCandidates, chooseStoryCandidate, listHistoricalPassagePatterns } from '../../src/ingress/revelation-story-engine.js';

test('builds 114 structural surah candidates from local Quran corpus', async () => {
  const rows = await buildStructuralStoryCandidates();
  assert.equal(rows.length, 114);
  assert.ok(rows.every((row) => row.status === 'STRUCTURAL_CANDIDATE'));
  assert.ok(rows.every((row) => row.sourceRefs.includes('QURAN-TANZIL-METADATA')));
});

test('historical passage patterns stay marked as reported context', async () => {
  const rows = await listHistoricalPassagePatterns();
  assert.ok(rows.some((row) => row.references.includes('96:1-5')));
  assert.ok(rows.some((row) => row.references.includes('24:11-20')));
  assert.ok(rows.every((row) => row.status === 'REPORTED_CONTEXT'));
});

test('story candidate selection is deterministic for a given seed', async () => {
  const a = await chooseStoryCandidate(12345);
  const b = await chooseStoryCandidate(12345);
  assert.deepEqual(a, b);
});
