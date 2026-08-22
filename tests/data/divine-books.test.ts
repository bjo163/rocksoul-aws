// @ts-nocheck
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const books = JSON.parse(fs.readFileSync(path.join(root, 'data/divine-books/divine-books.json'), 'utf8'));
const surahs = JSON.parse(fs.readFileSync(path.join(root, 'data/divine-books/quran-surahs.json'), 'utf8'));
const REQUIRED = ['id','type','schemaVersion','version','createdAt','createdBy','updatedAt','updatedBy','status','visibility','provenance','metadata'];

test('four divine book records exist', () => {
  assert.equal(books.length, 4);
  assert.deepEqual(books.map(x => x.canonicalName), ['TAWRAT','ZABUR','INJIL','QURAN']);
  for (const book of books) for (const k of REQUIRED) assert.ok(Object.hasOwn(book, k), `${book.id} missing ${k}`);
});

test('quran has complete 114-surah metadata index', () => {
  assert.equal(surahs.length, 114);
  assert.deepEqual(surahs.map(s => s.number), Array.from({length:114}, (_,i)=>i+1));
  assert.equal(surahs[0].name, 'Al-Fatihah');
  assert.equal(surahs[113].name, 'An-Nas');
  for (const s of surahs) {
    for (const k of REQUIRED) assert.ok(Object.hasOwn(s, k), `${s.id} missing ${k}`);
    assert.equal(s.bookId, 'BOOK-QURAN');
    assert.equal(s.type, 'DIVINE_BOOK.SURAH');
    assert.ok(Number.isInteger(s.verseCount) && s.verseCount > 0);
  }
});
