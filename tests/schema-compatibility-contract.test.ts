import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const schema = fs.readFileSync('packages/persistence/src/schema.ts', 'utf8');
test('schema contract keeps additive-first compatibility discipline', () => {
  assert.match(schema, /CREATE TABLE|create table/i);
  assert.doesNotMatch(schema, /DROP TABLE/i);
});

test('schema does not contain SQLite-specific runtime markers', () => {
  assert.doesNotMatch(schema, /sqlite/i);
});
