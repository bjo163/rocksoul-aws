// @ts-nocheck
import assert from 'node:assert/strict';
import {createRuntime} from '../../../src/core/kernel-runtime.js';

const rules = [
  {ruleId:'IDN.SMOKING.PUBLIC.2026',jurisdiction:'IDN',category:'PUBLIC_HEALTH',key:'SMOKING',effectiveFrom:'2026-01-01',status:'ACTIVE',priority:10},
  {ruleId:'IDN.EDU.ENROLL.2026',jurisdiction:'IDN',category:'EDUCATION',key:'ENROLLMENT',effectiveFrom:'2026-01-01',status:'ACTIVE',priority:10}
];
const rt = createRuntime({rules});
rt.typeRegistry.register({typeId:'HEALTH.CARE_EVENT',entityFamily:'EVENT',domain:'HEALTH'});
rt.typeRegistry.register({typeId:'EDUCATION.LEARNING_EVENT',entityFamily:'EVENT',domain:'EDUCATION'});
const person=rt.entities.create({entityId:'RID_TEST_001',type:'PERSON',data:{displayName:'Test'}});
const asset=rt.resources.create({type:'MONEY',owner:person.entityId,value:1000000,currency:'IDR'});
const rel=rt.relations.link({from:person.entityId,type:'OWNS',to:asset.resourceId});
const caseResult=rt.pipeline.execute({actor:person.entityId,eventType:'HEALTH.CARE_EVENT',jurisdiction:'IDN',ruleCategory:'PUBLIC_HEALTH',ruleKey:'SMOKING',relations:[{type:'OBSERVES_POLICY',to:'IDN.PUBLIC_HEALTH'}],accountability:{responsibility:{knowledge:0.5}}});
assert.equal(caseResult.entity.entityId,'RID_TEST_001');
assert.equal(caseResult.rule.ruleId,'IDN.SMOKING.PUBLIC.2026');
assert.equal(rt.relations.query({from:'RID_TEST_001',type:'OWNS'})[0].to,asset.resourceId);
assert.equal(rt.events.list({actor:'RID_TEST_001'}).length,1);
assert.equal(rt.typeRegistry.get('HEALTH.CARE_EVENT').entityFamily,'EVENT');
assert.equal(caseResult.accountability.actor,'RID_TEST_001');
console.log('PASS: universal kernel 6 assertions');
