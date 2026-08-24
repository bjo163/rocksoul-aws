import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const types = fs.readFileSync('packages/persistence/src/types.ts', 'utf8');
const factory = fs.readFileSync('packages/persistence/src/factory.ts', 'utf8');
const index = fs.readFileSync('packages/persistence/src/index.ts', 'utf8');

test('persistence public driver surface is limited to memory, file, and postgres', () => {
  assert.match(types, /'memory'\s*\|\s*'file'\s*\|\s*'postgres'/);
  assert.doesNotMatch(types, /'sqlite'/);
  assert.doesNotMatch(factory, /sqlite/);
  assert.doesNotMatch(index, /sqlite/);
});

test('persistence factory exposes a single createPersistence boundary', () => {
  assert.match(factory, /export function createPersistence/);
  assert.match(factory, /driver.*memory/);
  assert.match(factory, /driver.*file/);
  assert.match(factory, /driver.*postgres/);
});
