import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file: string) => fs.readFileSync(file, 'utf8');

test('5.0 platform freeze has an explicit compatibility and migration policy', () => {
  const roadmap = read('docs/ENGINEERING_ROADMAP.md');
  assert.match(roadmap, /5\.0\.0/);
  assert.match(roadmap, /compatibility/i);
  assert.match(roadmap, /migration/i);
  assert.match(roadmap, /reproducible release provenance/i);
});

test('production deployment remains PostgreSQL-only', () => {
  const compose = read('deploy/coolify/docker-compose.yml');
  assert.match(compose, /STORAGE_DRIVER: postgres/);
  assert.doesNotMatch(compose, /STORAGE_DRIVER:\s*(sqlite|sqlite3)/i);
});

test('v5 freeze preserves the dev to main release boundary', () => {
  const roadmap = read('docs/ENGINEERING_ROADMAP.md');
  assert.match(roadmap, /`dev` is the integration trunk/);
  assert.match(roadmap, /`main` receives only certified release commits/);
});
