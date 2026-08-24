import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/cab/src/App.tsx', 'utf8');
const css = fs.readFileSync('apps/cab/src/styles.css', 'utf8');
const api = fs.readFileSync('apps/cab/src/lib/api.ts', 'utf8');
const uiConfig = JSON.parse(fs.readFileSync('apps/cab/src/data/ui-config.json', 'utf8')) as { menus?: string[] };
const en = JSON.parse(fs.readFileSync('apps/cab/src/locales/en.json', 'utf8')) as { auth?: { provisioned?: string } };
const menus = uiConfig.menus ?? [];

test('all canonical menus are rendered from the UI config', () => {
  assert.ok(menus.length > 0, 'ui-config.json must define at least one menu');
  for (const menu of menus) assert.match(app, new RegExp(menu.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')));
});

test('authentication UI is complete', () => {
  for (const needle of ['login', 'logout', 'api.login', 'api.me', 'api.logout']) assert.ok(app.includes(needle) || api.includes(needle), needle);
  assert.match(app, /useTranslation\(locale\)\.auth/);
  assert.ok(en.auth?.provisioned, 'auth.provisioned translation is required');
  assert.ok(!app.includes('api.register'));
});

test('theme system consumes canonical Solar and Lunar preferences', () => {
  assert.match(app, /useCivicPreferences/);
  assert.match(app, /CivicShell/);
  assert.match(css, /--bg:var\(--mw-bg\)/);
  assert.doesNotMatch(app, /dataset\.theme|moonwitness\.theme/);
});

test('Civic Command visual system is present', () => {
  for (const token of ['--accent','--accent-2','--mw-bg','mw-orb','radial-gradient','backdrop-filter']) assert.ok(css.includes(token), token);
});

test('real-world environment is runtime-driven and does not expose simulation as reality', () => {
  assert.match(app, /health\?\.environment/);
  assert.match(app, /String\(health\?\.environment/);
  assert.doesNotMatch(app, /SIMULATION\s*←|MODE\s*=\s*SIMULATION/);
});

test('hero references use versioned prophets endpoint', () => assert.match(api, /\/api\/v1\/prophets/));
