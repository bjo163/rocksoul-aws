import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap = fs.readFileSync('docs/ENGINEERING_ROADMAP.md', 'utf8');
const ci = fs.readFileSync('docs/operations/CI_EXECUTION.md', 'utf8');

test('release process requires reproducible builds from a clean checkout', () => {
  assert.match(roadmap, /Deployment must be reproducible from a clean checkout/i);
  assert.match(roadmap, /reproducible release provenance/i);
});

test('main release evidence is tied to exact certification results', () => {
  assert.match(ci, /complete full-certification result for that exact commit/i);
});
