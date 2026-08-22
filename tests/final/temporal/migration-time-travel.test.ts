// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { temporalRecord, isValidAt, asOf } from '../../../src/sync/temporal.js';
import { createBaseModel, updateBaseModel, assertBaseModel } from '../../../src/models/base-model.js';

const human = {actorType:'HUMAN',actorId:'RID-001'};

test('temporal valid-time boundaries are correct', () => {
  const r=temporalRecord({data:{office:'A'},validFrom:'2026-01-01T00:00:00Z',validTo:'2027-01-01T00:00:00Z',version:1});
  assert.equal(isValidAt(r,'2026-06-01T00:00:00Z'),true);
  assert.equal(isValidAt(r,'2027-01-01T00:00:00Z'),false);
});

test('asOf chooses latest valid version', () => {
  const rs=[
    temporalRecord({data:{v:1},validFrom:'2026-01-01T00:00:00Z',validTo:'2026-06-01T00:00:00Z',version:1}),
    temporalRecord({data:{v:2},validFrom:'2026-06-01T00:00:00Z',version:2})
  ];
  assert.deepEqual(asOf(rs,'2026-07-01T00:00:00Z').data,{v:2});
});

test('model migration preserves identity and audit contract', () => {
  const v1=createBaseModel({id:'P-1',type:'PROJECT',createdBy:human,data:{name:'Old'}});
  const v2=updateBaseModel(v1,{updatedBy:human,patch:{data:{name:'New',budget:100}}});
  assert.equal(v2.id,v1.id);
  assert.equal(v2.version,2);
  assert.equal(v2.type,'PROJECT');
  assert.equal(v2.data.budget,100);
  assertBaseModel(v2);
});
