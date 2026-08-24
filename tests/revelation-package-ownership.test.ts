import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const canonicalPaths = [
  'packages/revelation/data/prophets.json',
  'packages/revelation/data/knowledge/prophet-scripture-index.json',
  'packages/revelation/data/knowledge/prophetic-events.json',
];

const legacyPaths = [
  'data/prophets.json',
  'data/knowledge/prophet-scripture-index.json',
  'data/knowledge/prophetic-events.json',
];

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = resolve(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...sourceFiles(full));
    else if (/\.(ts|tsx|mts|cts)$/.test(entry)) files.push(full);
  }
  return files;
}

test('Revelation package owns canonical Prophet seed data', () => {
  for (const path of canonicalPaths) assert.equal(existsSync(path), true, path);
  for (const path of legacyPaths) assert.equal(existsSync(path), false, path);
});

test('Revelation package seed paths are explicit and typed', () => {
  const expected = {
    'packages/revelation/data/prophets.json': 'REVELATION.PROPHET_PROFILE',
    'packages/revelation/data/knowledge/prophet-scripture-index.json': 'KNOWLEDGE.SCRIPTURE_REFERENCE',
    'packages/revelation/data/knowledge/prophetic-events.json': 'KNOWLEDGE.PROPHETIC_EVENT',
  } as const;

  assert.deepEqual(Object.keys(expected).sort(), [...canonicalPaths].sort());
  assert.equal(expected['packages/revelation/data/prophets.json'], 'REVELATION.PROPHET_PROFILE');
  assert.equal(expected['packages/revelation/data/knowledge/prophet-scripture-index.json'], 'KNOWLEDGE.SCRIPTURE_REFERENCE');
  assert.equal(expected['packages/revelation/data/knowledge/prophetic-events.json'], 'KNOWLEDGE.PROPHETIC_EVENT');
});

test('canonical Revelation implementation has no dependency on src/revelation', () => {
  const root = resolve(process.cwd(), 'packages/revelation/src');
  const dependencyPattern = /(?:import|export)\s+(?:[^;]*?from\s*)?["'](?:[^"']*\/)?src\/revelation(?:\/|["'])|require\(\s*["'][^"']*src\/revelation(?:\/|["'])/;
  const offenders = sourceFiles(root).filter((file) => dependencyPattern.test(readFileSync(file, 'utf8')));
  assert.deepEqual(offenders, []);
});
