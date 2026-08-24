import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('release version is consistent across root manifest and release notes', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
  const notes = fs.readFileSync('docs/RELEASE_NOTES_4.33.0.md', 'utf8');
  assert.match(notes, new RegExp(pkg.version.replaceAll('.', '\\.' )));
});
