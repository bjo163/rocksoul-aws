import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('XRP and Flow are independent applications with shared Civic Command UI',()=>{
  const xrpPackage=JSON.parse(fs.readFileSync('apps/xrp/package.json','utf8'));
  const flowPackage=JSON.parse(fs.readFileSync('apps/flow/package.json','utf8'));
  const xrp=fs.readFileSync('apps/xrp/src/App.tsx','utf8');
  const flow=fs.readFileSync('apps/flow/src/App.tsx','utf8');
  assert.equal(xrpPackage.name,'@moonwitness/xrp');
  assert.equal(flowPackage.name,'@moonwitness/flow');
  for(const source of [xrp,flow]) {
    assert.match(source,/CivicShell/);
    assert.match(source,/useCivicPreferences/);
    assert.match(source,/RID/);
    assert.match(source,/credentials:'include'/);
    assert.doesNotMatch(source,/demo1234|Youknowm@3|RUH ID/i);
  }
});

test('XRP is RID-scoped public workspace and Flow preserves governance boundaries',()=>{
  const xrp=fs.readFileSync('apps/xrp/src/App.tsx','utf8');
  const flow=fs.readFileSync('apps/flow/src/App.tsx','utf8');
  assert.match(xrp,/My Cases/); assert.match(xrp,/Bukti/); assert.match(xrp,/Flow Studio/);
  assert.match(flow,/HUMAN AUTHORITY · LIMITED/);
  assert.match(flow,/Human gate/);
  assert.match(flow,/Witness commit/);
  assert.match(flow,/requestReview/);
  assert.match(flow,/REQUEST_HUMAN_REVIEW|request-review/);
});

test('both new applications provide Indonesian and English from their first shell',()=>{
  for(const file of ['apps/xrp/src/App.tsx','apps/flow/src/App.tsx']) {
    const source=fs.readFileSync(file,'utf8');
    assert.match(source,/const copy=\{\s*id:/);
    assert.match(source,/,\s*en:/);
    assert.match(source,/onLocaleChange/);
  }
});
