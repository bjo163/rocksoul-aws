import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('CAB and public web consume the shared MoonWitness UI package',()=>{
  const cabMain=fs.readFileSync('apps/cab/src/main.tsx','utf8'); const webMain=fs.readFileSync('apps/web/src/main.tsx','utf8'); const webApp=fs.readFileSync('apps/web/src/App.tsx','utf8');
  assert.match(cabMain,/@moonwitness\/ui\/styles\.css/); assert.match(webMain,/@moonwitness\/ui\/styles\.css/); assert.match(webApp,/BrandMark/);
});

test('shared UI exports accessible primitives and stable design tokens',()=>{
  const primitives=fs.readFileSync('packages/ui/src/primitives.tsx','utf8'); const styles=fs.readFileSync('packages/ui/src/styles.css','utf8');
  for(const name of ['Button','Input','Badge','Card','Modal']) assert.match(primitives,new RegExp(`function ${name}`));
  for(const token of ['--mw-bg','--mw-text','--mw-accent','--mw-danger','focus-visible']) assert.match(styles,new RegExp(token));
});
