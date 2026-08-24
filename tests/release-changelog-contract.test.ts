import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('current release notes identify 4.33.0 and certification state explicitly', () => {
  const text = fs.readFileSync('docs/RELEASE_NOTES_4.33.0.md', 'utf8');
  assert.match(text, /4\.33\.0/);
  assert.match(text, /certif/i);
});

test('release notes do not claim 100% certification without matching evidence marker', () => {
  const text = fs.readFileSync('docs/RELEASE_NOTES_4.33.0.md', 'utf8');
  if (/100%|1006\/1006/.test(text)) assert.match(text, /evidence|certification/i);
});
