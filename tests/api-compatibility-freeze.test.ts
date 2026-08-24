import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const openapi = fs.readFileSync('docs/api/openapi.json', 'utf8');
const contract = fs.readFileSync('docs/api/API_CONTRACT.md', 'utf8');

test('API v1 remains the public compatibility surface', () => {
  assert.match(openapi, /\/api\/v1/);
  assert.match(contract, /\/api\/v1/);
});

test('breaking API changes require an explicit version decision', () => {
  assert.match(contract, /breaking changes require a versioning decision/i);
});
