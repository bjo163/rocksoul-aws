import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const certification = fs.readFileSync('docs/PRODUCTION_CERTIFICATION.md', 'utf8');

test('horizontal API deployment requires distributed rate limiting', () => {
  assert.match(certification, /distributed enforcement is enabled before more than one API instance is deployed/i);
  assert.match(certification, /shared distributed limiter/i);
});

test('local rate limits are not represented as sufficient for multi-instance certification', () => {
  assert.match(certification, /multi-instance topology/i);
});
