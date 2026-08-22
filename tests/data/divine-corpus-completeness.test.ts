// @ts-nocheck
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/knowledge/hadith-corpus-manifest.json'), 'utf8'));
const prophets = JSON.parse(fs.readFileSync(path.join(root, 'data/prophets.json'), 'utf8'));
const divineBooks = JSON.parse(fs.readFileSync(path.join(root, 'data/divine-books/divine-books.json'), 'utf8'));

test('hadith corpus manifest is pinned and complete by declared book set', () => {
  assert.equal(manifest.tag, 'v1.5.0-hapi');
  assert.equal(manifest.expectedBookCount, 18);
  assert.equal(manifest.books.length, 18);
  assert.ok(manifest.rawBaseUrl.includes('@v1.5.0-hapi'));
});

test('25 prophets remain complete', () => {
  assert.equal(prophets.length, 25);
  assert.equal(new Set(prophets.map((p) => p.id)).size, 25);
});

test('four divine book categories remain canonical', () => {
  const ids = new Set(divineBooks.map((b) => b.id));
  for (const id of ['BOOK-QURAN', 'BOOK-TAWRAT', 'BOOK-ZABUR', 'BOOK-INJIL']) assert.ok(ids.has(id), id);
});
