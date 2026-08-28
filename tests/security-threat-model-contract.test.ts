import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cert = fs.readFileSync('docs/PRODUCTION_CERTIFICATION.md', 'utf8');
const roadmap = fs.readFileSync('docs/ENGINEERING_ROADMAP.md', 'utf8');

test('security certification has explicit fail-closed production prerequisites', () => {
  assert.match(cert, /non-default managed `JWT_SECRET`/i);
  assert.match(cert, /explicit browser-origin allowlist/i);
  assert.match(cert, /secure cookie policy/i);
  assert.match(cert, /secrets are absent/i);
});

test('v5 roadmap includes threat-model review', () => {
  assert.match(roadmap, /threat-model review/i);
});
