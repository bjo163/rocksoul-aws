import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file: string) => fs.readFileSync(file, 'utf8');

test('1 release notes expose explicit certification-pending state', () => {
  assert.match(read('docs/RELEASE_NOTES_4.33.0.md'), /certification pending/i);
});

test('2 API contract keeps v1 routes versioned', () => {
  assert.match(read('docs/api/API_CONTRACT.md'), /\/api\/v1/);
});

test('3 unsupported SQLite backend remains explicitly excluded', () => {
  assert.match(read('docs/api/API_CONTRACT.md'), /SQLite is not a supported/i);
  assert.match(read('apps/api/src/app.ts'), /Supported drivers: file, postgres/);
});

test('4 deployment uses PostgreSQL storage', () => {
  assert.match(read('deploy/coolify/docker-compose.yml'), /STORAGE_DRIVER: postgres/);
});

test('5 deployment has a PostgreSQL health dependency', () => {
  assert.match(read('deploy/coolify/docker-compose.yml'), /condition: service_healthy/);
});

test('6 deployment readiness is used by the API healthcheck', () => {
  assert.match(read('deploy/coolify/docker-compose.yml'), /api\/v1\/ready/);
});

test('7 deployment does not expose API port directly', () => {
  const compose = read('deploy/coolify/docker-compose.yml');
  assert.match(compose, /expose:/);
  assert.doesNotMatch(compose, /ports:\s*\n\s*- ['\"]3000:/);
});

test('8 production certification distinguishes CI-pending from certified', () => {
  assert.match(read('docs/PRODUCTION_CERTIFICATION.md'), /ci-pending/);
  assert.match(read('docs/PRODUCTION_CERTIFICATION.md'), /certified/);
});

test('9 roadmap keeps dev as integration trunk and main as certified destination', () => {
  const roadmap = read('docs/ENGINEERING_ROADMAP.md');
  assert.match(roadmap, /`dev` is the integration trunk/);
  assert.match(roadmap, /`main` receives only certified release commits/);
});

test('10 native router has permission and authentication boundaries', () => {
  const router = read('apps/api/src/router.ts');
  assert.match(router, /requirePermission/);
  assert.match(router, /requireAuthenticated/);
});
