// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import {createShadowProfile,createPersonalScenario,scenarioRelations} from '../../../src/shadow/shadow.js';

test('v2.19 shadow scenario',()=>{
  const shadow=createShadowProfile({name:'Isa Reference',archetype:'PROPHETIC_REFERENCE'});
  const scenario=createPersonalScenario({operatorRid:'RID-001',shadowId:shadow.shadowId,missionId:'MIS-1'});
  const rel=scenarioRelations({scenario,shadowId:shadow.shadowId,missionId:'MIS-1',projectIds:['PROJ-1']});
  assert.equal(scenario.type,'PERSONAL_SCENARIO'); assert.equal(rel.length,3); assert.equal(rel[0].type,'USES_SHADOW');
});
