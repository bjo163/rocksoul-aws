// @ts-nocheck
import assert from 'node:assert/strict';
import {TypeRegistry, DepartmentRegistry, EntityStore, RelationStore, EventStore, StateStore, AccountabilityKernel, RuleEngine, UniversalPipeline} from '../../../src/kernel/index.js';

const tr=new TypeRegistry();
const dr=new DepartmentRegistry(tr);
const types=[
  ['HEALTH','HEALTH.CARE_EVENT'],['EDUCATION','EDUCATION.LEARNING_EVENT'],['FISCAL','FISCAL.TAX_ASSESSMENT'],['JUSTICE','JUSTICE.CASE'],['GOVERNANCE','GOVERNANCE.PROJECT'],['WEALTH','WEALTH.ASSET']
];
for(const [departmentId,typeId] of types) dr.define({departmentId,typeId});
const entities=new EntityStore();
const relations=new RelationStore();
const events=new EventStore();
const states=new StateStore();
const accountability=new AccountabilityKernel();
const rules=new RuleEngine([{ruleId:'GENERIC.TEST',jurisdiction:'IDN',category:'TEST',key:'ALLOW',effectiveFrom:'2020-01-01',status:'ACTIVE',priority:1}]);
const pipeline=new UniversalPipeline({entities,relations,events,rules,states,accountability,typeRegistry:tr});
const person=entities.create({entityId:'RID_DEPARTMENT_TEST',type:'PERSON'});
for(const [,typeId] of types){const out=pipeline.execute({actor:person.entityId,eventType:typeId,jurisdiction:'IDN',ruleCategory:'TEST',ruleKey:'ALLOW'});assert.equal(out.event.type,typeId);}
assert.equal(events.list({actor:person.entityId}).length,types.length);
assert.equal(tr.list().length,types.length);
console.log('PASS: generic department type-pack test 8 assertions');
