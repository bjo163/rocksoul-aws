// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createActor, ACTOR_TYPES } from '../../../src/identity/actor.js';
import { createBaseModel, assertBaseModel } from '../../../src/models/base-model.js';
import { createCabBoard } from '../../../src/cab/simple-board.js';

const root = process.cwd();

test('actor catalog includes human/bot/ai/system/service/process', () => {
  const actors = JSON.parse(fs.readFileSync(path.join(root,'data/identity/actors.json'),'utf8'));
  assert.equal(actors.length, ACTOR_TYPES.length);
  for (const t of ACTOR_TYPES) assert.ok(actors.some(a => a.type === t));
});

test('base model requires canonical audit metadata', () => {
  const model = createBaseModel({ id:'X-001', type:'TEST', createdBy:'RID-001' });
  assert.doesNotThrow(() => assertBaseModel(model));
  assert.equal(model.createdBy, 'RID-001');
  assert.equal(model.updatedBy, 'RID-001');
  assert.equal(model.version, 1);
});

test('invalid model without updatedBy is rejected', () => {
  const model = createBaseModel({ id:'X-002', type:'TEST', createdBy:'RID-001' });
  delete model.updatedBy;
  assert.throws(() => assertBaseModel(model));
});

test('CAB board uses shadow/operator and hero reference', () => {
  const board = createCabBoard({ id:'CAB-001', mission:'EDUCATION', operatorRid:'RID-001', heroReferenceId:'YUSUF' });
  assert.equal(board.type, 'CAB.BOARD');
  assert.equal(board.data.shadowId, 'RID-001');
  assert.equal(board.data.heroReferenceId, 'YUSUF');
  assert.doesNotThrow(() => assertBaseModel(board));
});

test('25 prophet master data is complete', () => {
  const prophets = JSON.parse(fs.readFileSync(path.join(root,'data/prophets.json'),'utf8'));
  assert.equal(prophets.length, 25);
  assert.equal(new Set(prophets.map(p=>p.id)).size, 25);
  assert.deepEqual(prophets.map(p=>p.order), Array.from({length:25},(_,i)=>i+1));
  assert.equal(prophets.find(p=>p.id==='ISA').order, 24);
  assert.equal(prophets.find(p=>p.id==='MUHAMMAD').order, 25);
});
