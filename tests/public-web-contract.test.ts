import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('apps/web/src/App.tsx','utf8');
const layout=fs.readFileSync('apps/web/app/layout.tsx','utf8');

test('public web is a public home rather than the internal CAB',()=>{
  assert.match(app,/Evidence before certainty/);
  assert.match(app,/IMPORTANT BOUNDARY/);
  assert.doesNotMatch(app,/CAB ↗|VITE_CAB_URL/);
  assert.doesNotMatch(app,/localStorage|auth\/login|ADMIN/);
});

test('public web declares public metadata and system boundary',()=>{
  assert.match(layout,/MoonWitness OS/);
  assert.match(layout,/openGraph/);
  assert.match(layout,/og\.png/);
  assert.match(layout,/summary_large_image/);
  assert.match(layout,/description/);
  assert.match(layout,/x-forwarded-host/);
});

test('public web exposes the current release status without stale certification claims',()=>{
  assert.match(app,/4\.33\.0 — certification pending/);
  assert.match(app,/CERTIFICATION PENDING/);
  assert.doesNotMatch(app,/v4\.32|4\.32\.0/);
  assert.doesNotMatch(app,/1,007 API checks/);
});
