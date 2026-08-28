import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyticalSemanticVector, SemanticRegistry } from '../src/index.js';

test('semantic vector preserves primary precedence and non-normative boundary', () => {
  const vector = buildAnalyticalSemanticVector({
    primary: ['SIG-A'],
    secondary: ['SIG-B', 'SIG-C'],
    mode: 'DEVIATION',
  });

  assert.deepEqual(vector.primary, ['SIG-A']);
  assert.equal(vector.mode, 'DEVIATION');
  assert.equal(vector.semanticReady, true);
  assert.equal(vector.normativeAuthority, false);
  assert.ok(vector.weights['SIG-A'] > vector.weights['SIG-B']);
  assert.deepEqual(vector.attributes.map((attribute) => attribute.id), ['SIG-A', 'SIG-B', 'SIG-C']);
});

test('semantic vector normalizes keys, relevance, and empty input deterministically', () => {
  const vector = buildAnalyticalSemanticVector({
    primary: [51, 51],
    secondary: [50],
    relevance: { '51': 2, '50': -1 },
  });

  assert.deepEqual(vector.primary, ['51', '51']);
  assert.equal(vector.weights['51'], 1);
  assert.equal(vector.weights['50'], 0);
  assert.equal(buildAnalyticalSemanticVector().semanticReady, false);
});

test('semantic registry provides isolated snapshots and tolerates missing files', async () => {
  const registry = new SemanticRegistry({
    trust: { id: 'trust', label: 'Trust', source_note: 'engineering fixture' },
  });
  assert.equal(registry.get('trust')?.label, 'Trust');
  assert.deepEqual(registry.all().map((definition) => definition.id), ['trust']);

  const snapshot = registry.snapshot();
  snapshot.definitions.trust.label = 'mutated copy';
  assert.equal(registry.get('trust')?.label, 'Trust');

  const missing = await SemanticRegistry.fromFile('missing-semantic-registry.json');
  assert.deepEqual(missing.all(), []);
});
