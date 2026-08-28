import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cert = fs.readFileSync('docs/PRODUCTION_CERTIFICATION.md', 'utf8');
const roadmap = fs.readFileSync('docs/ENGINEERING_ROADMAP.md', 'utf8');

test('AI governance remains part of the platform contract', () => {
  assert.match(roadmap, /AI provider\/evaluation contract/i);
});

test('AI output remains traceable through evidence/Witness boundaries', () => {
  assert.match(cert, /Witness/i);
  assert.match(roadmap, /provenance\/evidence integrity/i);
});
