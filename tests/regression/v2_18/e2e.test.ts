// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import {createPersonalScenario,createShadowProfile} from '../../../src/shadow/shadow.js';

test('v2.18 end-to-end personal graph smoke',()=>{
  const rid='RID-E2E';
  const shadow=createShadowProfile({name:'Knowledge Researcher'});
  const s=createPersonalScenario({operatorRid:rid,shadowId:shadow.shadowId,objectives:['VERIFY_CLAIM']});
  const graph=[{from:rid,type:'OPERATES',to:s.scenarioId},{from:s.scenarioId,type:'USES_SHADOW',to:shadow.shadowId},{from:s.scenarioId,type:'TARGETS',to:'VERIFICATION-1'}];
  const ids=new Set(graph.map(x=>x.to)); assert.equal(ids.size,3); assert.equal(graph[0].from,rid);
});
