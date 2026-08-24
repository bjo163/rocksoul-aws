import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('workspace lockfile exists and is non-empty', () => {
  const lock = fs.readFileSync('package-lock.json', 'utf8');
  assert.ok(lock.length > 1000);
  assert.match(lock, /lockfileVersion/);
});

test('package manifest and lockfile stay on the same root release', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8')) as { packages?: { '': { version: string } } };
  assert.equal(lock.packages?.['']?.version, pkg.version);
});
