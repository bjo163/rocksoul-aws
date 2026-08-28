import assert from 'node:assert/strict';
import test from 'node:test';
import { engineCatalog } from '../src/engine-catalog.js';

test('engine catalog exposes independently testable and durable workflow operations', () => {
  const catalog = engineCatalog();
  assert.equal(catalog.protocol, 'MW_ENGINE_CATALOG_V1');
  assert.ok(catalog.operations.some((operation) => operation.kind === 'UNIT' && operation.id === 'mizan.evaluate'));
  assert.ok(catalog.operations.some((operation) => operation.kind === 'WORKFLOW' && operation.id === 'workflow.analyze'));
  assert.ok(catalog.operations.every((operation) => operation.path.startsWith('/api/v1/')));
  assert.ok(catalog.operations.filter((operation) => operation.kind !== 'SNAPSHOT').every((operation) => operation.requestExample));
});
