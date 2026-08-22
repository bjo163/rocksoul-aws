import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('CAB and public web consume the shared MoonWitness UI package',()=>{
  const cabMain=fs.readFileSync('apps/cab/src/main.tsx','utf8'); const webLayout=fs.readFileSync('apps/web/app/layout.tsx','utf8'); const webApp=fs.readFileSync('apps/web/src/App.tsx','utf8');
  assert.match(cabMain,/@moonwitness\/ui\/styles\.css/); assert.match(webLayout,/@moonwitness\/ui\/styles\.css/); assert.match(webApp,/CivicPublicHeader/);
});

test('shared UI exports accessible primitives and stable design tokens',()=>{
  const primitives=fs.readFileSync('packages/ui/src/primitives.tsx','utf8'); const system=fs.readFileSync('packages/ui/src/system.tsx','utf8'); const styles=fs.readFileSync('packages/ui/src/styles.css','utf8');
  for(const name of ['Button','Input','Badge','Card','Modal']) assert.match(primitives,new RegExp(`function ${name}`));
  for(const name of ['CivicShell','CivicPublicHeader','PreferenceControls','BoundaryNotice','IdentityPlate','StatusBadge','Metric','CausalLane']) assert.match(system,new RegExp(`function ${name}`));
  assert.match(fs.readFileSync('packages/ui/src/index.ts','utf8'),/governed/);
  for(const token of ['--mw-bg','--mw-text','--mw-accent','--mw-danger','--mw-positive','--mw-warning','focus-visible','prefers-reduced-motion','data-mw-theme']) assert.match(styles,new RegExp(token));
});

test('shared Civic Command shell owns theme, localization and RID identity semantics',()=>{
  const system=fs.readFileSync('packages/ui/src/system.tsx','utf8');
  assert.match(system,/CivicTheme = 'solar' \| 'lunar'/);
  assert.match(system,/CivicLocale = 'id' \| 'en'/);
  assert.match(system,/aria-label={`RID /);
  assert.doesNotMatch(system,/spiritual rank|moral score/i);
});

test('CAB and public web use one shared preference and shell implementation',()=>{
  const cab=fs.readFileSync('apps/cab/src/App.tsx','utf8'); const web=fs.readFileSync('apps/web/src/App.tsx','utf8');
  assert.match(cab,/CivicShell/); assert.match(cab,/useCivicPreferences/); assert.match(cab,/identity=\{user\.rid/);
  assert.match(web,/CivicPublicHeader/); assert.match(web,/useCivicPreferences/); assert.match(web,/const copy = \{/);
  assert.doesNotMatch(cab,/dataset\.theme|moonwitness\.theme/);
});
