import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cert = fs.readFileSync('docs/PRODUCTION_CERTIFICATION.md', 'utf8');
const roadmap = fs.readFileSync('docs/ENGINEERING_ROADMAP.md', 'utf8');

test('production certification requires current-run evidence and warning classification', () => {
  assert.match(cert, /current run used as certification evidence/i);
  assert.match(cert, /release blocker/i);
});

test('observability remains part of 4.33.1 hardening', () => {
  assert.match(roadmap, /structured observability/i);
});
