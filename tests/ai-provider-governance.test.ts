import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('apps/api/src/app.ts', 'utf8');

test('AI analysis keeps provider selection explicit and versioned', () => {
  assert.match(source, /semanticProvider/);
  assert.match(source, /modelVersion/);
  assert.match(source, /MOONWITNESS_RELEASE_VERSION/);
  assert.match(source, /analyzeWithProvider/);
});

test('AI analysis persists evidence and witness context before completing', () => {
  assert.match(source, /persistedEvidence/);
  assert.match(source, /saveCase/);
  assert.match(source, /appendMizanWitness/);
});
