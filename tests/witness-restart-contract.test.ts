import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/api/src/app.ts', 'utf8');

test('witness state is hydrated from local durable storage on startup', () => {
  assert.match(app, /LocalWitnessDagStore\.open/);
  assert.match(app, /\.hydrate\(witnessDag\)/);
});

test('witness state is persisted during shutdown', () => {
  assert.match(app, /witnessDagStore/);
  assert.match(app, /witnessDagStore\.save/);
});
