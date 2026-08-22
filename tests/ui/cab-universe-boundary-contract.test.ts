import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const boundary = fs.readFileSync('apps/cab/src/components/UniverseBoundary.tsx', 'utf8');

test('CAB Universe renders explicit uncertainty and empty-state boundaries', () => {
  for (const token of ['UNRESOLVED_PRESENT', 'NO_EVIDENCE', 'INTEGRITY_ALERT', 'missing knowledge', 'Divine, legal, or factual verdict']) {
    assert.ok(boundary.includes(token), token);
  }
});
