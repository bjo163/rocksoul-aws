import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/cab/src/App.tsx', 'utf8');
const api = fs.readFileSync('apps/cab/src/lib/api.ts', 'utf8');
const uiConfig = JSON.parse(fs.readFileSync('apps/cab/src/data/ui-config.json', 'utf8')) as { menus?: string[] };

test('CAB has governed login/logout/session without public registration', () => {
  for (const s of ['login', 'logout', 'api.login', 'api.me', 'api.logout']) assert.ok(app.includes(s) || api.includes(s), s);
  assert.ok(!app.includes('api.register'));
  assert.ok(!api.includes('register:'));
});

test('ui has canonical menu', () => {
  assert.ok(app.includes('appCode="CAB"'));
  const menus = uiConfig.menus ?? [];
  assert.ok(menus.length > 0, 'ui-config.json must define canonical menus');
  for (const menu of menus) assert.ok(app.includes(menu), menu);
});

test('ui has versioned prophet API', () => assert.ok(api.includes('/api/v1/prophets')));

test('ui exposes runtime environment and database health', () => {
  for (const s of ['health?.environment', 'health?.database']) assert.ok(app.includes(s), s);
});
