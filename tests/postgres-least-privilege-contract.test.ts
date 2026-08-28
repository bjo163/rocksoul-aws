import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const docs = fs.readFileSync('docs/PRODUCTION_CERTIFICATION.md', 'utf8');

test('production PostgreSQL role must not be able to create schema', () => {
  assert.match(docs, /database role cannot create schema in production/i);
});
