import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap = fs.readFileSync('docs/ENGINEERING_ROADMAP.md', 'utf8');
const certification = fs.readFileSync('docs/PRODUCTION_CERTIFICATION.md', 'utf8');

test('distributed execution defines queue leases, retries, and dead-letter semantics', () => {
  assert.match(roadmap, /queue leases\/retries\/dead-letter semantics/i);
});

test('multi-instance deployment requires distributed rate-limit enforcement', () => {
  assert.match(certification, /distributed enforcement is enabled before more than one API instance/i);
});
