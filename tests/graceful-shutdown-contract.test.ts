import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/api/src/app.ts', 'utf8');

test('API shutdown stops persistent jobs before closing stores', () => {
  assert.match(app, /jobs\.stop\(\)/);
  assert.match(app, /universeStore\.close\(\)/);
  assert.match(app, /httpServer\.close/);
});
