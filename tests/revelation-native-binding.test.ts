// @ts-nocheck
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { bindActionToRevelation } from '../src/revelation/binding/native-revelation-binder.js';

const expected={CORRUPTION:'NEGATIVE',RESTITUTION:'POSITIVE',LYING:'NEGATIVE',DEFAMATION:'NEGATIVE',VERIFY_CLAIM:'POSITIVE',HELPING_GOOD:'POSITIVE',THEFT:'NEGATIVE',SMOKING:'UNRESOLVED'};

test('native Revelation binder discovers moral direction without action-to-verse table',()=>{
  const rows=Object.entries(expected).map(([action,direction])=>({action,b:bindActionToRevelation({action,root:process.cwd()}),direction}));
  console.log(JSON.stringify(rows.map(x=>({action:x.action,direction:x.b.direction,status:x.b.status,refs:x.b.references,confidence:x.b.confidence})),null,2));
  for(const x of rows){
    assert.equal(x.b.direction,x.direction,x.action);
    if(x.action!=='SMOKING'){
      assert.equal(x.b.pureNormativeDerivation,true,x.action);
      assert.ok(x.b.references.length>0,x.action);
    }
  }
});

test('language query profiles contain no verse references or moral scores',()=>{
  const raw=fs.readFileSync('data/revelation/language-concept-anchors.json','utf8');
  const data=JSON.parse(raw);
  assert.equal(data.normativeAuthority,false);
  assert.equal(/\bQ?\d{1,3}:\d{1,3}\b/.test(raw),false,'query bridge must not contain verse references');
  assert.equal(/moralScore|rewardScore|sinScore|direction\s*"?:/i.test(raw),false,'query bridge must not contain moral score/direction');
  const actions=JSON.parse(fs.readFileSync('data/registries/action-semantics.json','utf8'));
  assert.equal(Object.values(actions.actions).some((a:any)=>a.quranGrounding),false,'legacy action registry must not carry action-to-verse grounding');
});
