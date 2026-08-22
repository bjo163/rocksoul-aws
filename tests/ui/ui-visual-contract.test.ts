import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/cab/src/App.tsx','utf8');
const css = fs.readFileSync('apps/cab/src/styles.css','utf8');
const api = fs.readFileSync('apps/cab/src/lib/api.ts','utf8');

const menus = ['HOME','CASE WORKFLOW','CAB','SHADOW','HEROES','MISSIONS','PROJECTS','KNOWLEDGE','RESOURCES','LIFE','ASMA','MĪZĀN','AUDIT'];

test('all canonical menus are rendered', () => {
  for (const menu of menus) assert.match(app, new RegExp(menu.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')));
});

test('authentication UI is complete', () => {
  for (const needle of ['login','register','logout','api.login','api.register','api.me','api.logout','moonwitness.auth']) assert.ok(app.includes(needle) || api.includes(needle), needle);
});

test('theme system supports dark and light', () => {
  assert.match(app, /Theme = 'dark' \| 'light'/);
  assert.match(app, /dataset\.theme/);
  assert.match(app, /Toggle theme/);
  assert.match(css, /:root\[data-theme="light"\]/);
  assert.match(css, /color-scheme: dark/);
  assert.match(css, /color-scheme: light/);
});

test('cosmic visual system is present', () => {
  for (const token of ['--accent','--accent-2','mw-stars','mw-orb','radial-gradient','backdrop-filter']) assert.ok(css.includes(token), token);
});

test('real-world default remains visible', () => {
  assert.match(app, /REAL/);
  assert.doesNotMatch(app, /SIMULATION\s*←|MODE\s*=\s*SIMULATION/);
});

test('hero references use versioned prophets endpoint', () => assert.match(api, /\/api\/v1\/prophets/));
