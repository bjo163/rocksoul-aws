import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap = fs.readFileSync('docs/ENGINEERING_ROADMAP.md', 'utf8');
const cert = fs.readFileSync('docs/PRODUCTION_CERTIFICATION.md', 'utf8');

test('product surfaces remain separate certification targets', () => {
  assert.match(cert, /### CAB/);
  assert.match(cert, /### XRP/);
  assert.match(cert, /### Flow/);
});

test('4.36 product release explicitly covers Web/XRP/CAB/Flow integration', () => {
  assert.match(roadmap, /Web, XRP, CAB, and Flow production integration/i);
});
