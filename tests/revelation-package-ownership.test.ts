import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('canonical revelation package never depends on src/revelation', () => {
  const indexPath = resolve(process.cwd(), 'packages/revelation/src/index.ts');
  const source = readFileSync(indexPath, 'utf8');
  assert.doesNotMatch(source, /\.\.\/\.\.\/\.\.\/src\/revelation/);
  assert.doesNotMatch(source, /from\s+['\"][^'\"]*src\/revelation/);
});

test('canonical package exposes only local revelation modules', () => {
  const indexPath = resolve(process.cwd(), 'packages/revelation/src/index.ts');
  const source = readFileSync(indexPath, 'utf8');
  const exports = [...source.matchAll(/export \* from ['\"](\.\/[^'\"]+)['\"];?/g)].map((match) => match[1]);
  assert.ok(exports.length >= 10);
  assert.ok(exports.every((item) => item.startsWith('./')));
});
