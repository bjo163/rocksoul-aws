import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('shared preferences expose pressed state and localized skip navigation',()=>{
  const source=fs.readFileSync('packages/ui/src/system.tsx','utf8');
  assert.match(source,/aria-pressed/);
  assert.match(source,/Lewati ke konten utama/);
  assert.match(source,/mw-public-nav/);
});

test('shared modal has dialog semantics, Escape handling, and focus restoration',()=>{
  const source=fs.readFileSync('packages/ui/src/primitives.tsx','utf8');
  for(const token of ['role="dialog"','aria-modal="true"','aria-labelledby','event.key===\'Escape\'','previous?.focus()']) assert.ok(source.includes(token),token);
});

test('CAB records can be selected without a pointer',()=>{
  const source=fs.readFileSync('apps/cab/src/components/model/ModelTable.tsx','utf8');
  assert.match(source,/tabIndex=\{0\}/);
  assert.match(source,/event\.key===\'Enter\'/);
  assert.match(source,/scope="col"/);
});

test('all four visual applications expose theme and locale controls',()=>{
  for(const file of ['apps/web/src/App.tsx','apps/cab/src/App.tsx','apps/xrp/src/App.tsx','apps/flow/src/App.tsx']) {
    const source=fs.readFileSync(file,'utf8');
    assert.match(source,/useCivicPreferences/);
    assert.match(source,/onLocaleChange/);
    assert.match(source,/onThemeChange/);
  }
});
