import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('CAB Universe has explicit uncertainty/empty-state boundary', async () => {
  const source = await readFile('apps/cab/src/components/UniverseBoundary.tsx', 'utf8');
  assert.match(source, /UNRESOLVED_PRESENT/);
  assert.match(source, /NO_EVIDENCE/);
  assert.match(source, /INTEGRITY_ALERT/);
  assert.match(source, /data-testid="cab-universe-boundary"/);
  assert.match(source, /negative proof/i);
});
