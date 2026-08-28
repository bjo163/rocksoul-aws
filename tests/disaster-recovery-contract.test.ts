import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cert = fs.readFileSync('docs/PRODUCTION_CERTIFICATION.md', 'utf8');
const roadmap = fs.readFileSync('docs/ENGINEERING_ROADMAP.md', 'utf8');

test('production certification requires isolated PostgreSQL restore evidence', () => {
  assert.match(cert, /restore completed into an isolated instance/i);
  assert.match(cert, /row counts and representative/i);
  assert.match(cert, /point-in-time recovery/i);
});

test('v5 roadmap requires a disaster recovery rehearsal', () => {
  assert.match(roadmap, /disaster recovery rehearsal/i);
});
