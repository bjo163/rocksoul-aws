import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('SDK package remains independently importable and versioned', () => {
  const pkg = path.resolve('packages/sdk/package.json');
  assert.ok(fs.existsSync(pkg), 'packages/sdk/package.json must exist');
  const manifest = JSON.parse(fs.readFileSync(pkg, 'utf8')) as { name?: string; version?: string; exports?: unknown };
  assert.equal(manifest.name, '@moonwitness/sdk');
  assert.match(String(manifest.version ?? ''), /^4\./);
});

test('SDK exposes a stable entrypoint', () => {
  assert.ok(fs.existsSync(path.resolve('packages/sdk/src/index.ts')));
});
