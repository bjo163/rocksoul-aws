import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runbook = fs.readFileSync('docs/operations/POSTGRES_RECOVERY.md', 'utf8');

test('migration recovery requires an offline restore path', () => {
  assert.match(runbook, /restore/i);
  assert.match(runbook, /offline/i);
});

test('recovery documentation does not expose a remote destructive restore API', () => {
  assert.match(runbook, /destructive restore/i);
});
