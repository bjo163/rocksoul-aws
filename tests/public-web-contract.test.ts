import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('apps/web/src/App.tsx','utf8');
const html=fs.readFileSync('apps/web/index.html','utf8');

test('public web is a public home rather than the internal CAB',()=>{
  assert.match(app,/Evidence before certainty/);
  assert.match(app,/IMPORTANT BOUNDARY/);
  assert.match(app,/VITE_CAB_URL/);
  assert.doesNotMatch(app,/localStorage|auth\/login|ADMIN/);
});

test('public web declares public metadata and system boundary',()=>{
  assert.match(html,/MoonWitness OS/);
  assert.match(html,/og:title/);
  assert.match(html,/og:image.*og\.png/);
  assert.match(html,/twitter:card/);
  assert.match(html,/description/);
});
