import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';

test('smoking text alone does not trigger a hardcoded classifier', () => {
  const r = buildAiAnalysis('merokok saat puasa di tempat umum');
  assert.equal(r.intent, 'UNRESOLVED');
  assert.equal(r.candidateActions.length, 0);
  assert.equal(r.mizan, null);
});
