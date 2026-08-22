// @ts-nocheck
import assert from 'node:assert/strict';
import {createPerson,createAmal,evaluateAmal} from '../src/engine.js';
import { asmaEngineCandidates } from '../src/revelation/asma/asma-engine.js';
const p=createPerson();
const a=createAmal({person:p,sourceId:'S01',gatewayId:'G01',processId:'P01',action:'TEST'});
assert.equal(a.genesis.valid,true);
assert.equal(a.genesis.sourceId,'S01');
assert.ok(asmaEngineCandidates().length>0);
const r=evaluateAmal(a,{semantic:{R:0,G:0,B:1,L:0}});
assert.equal(r.asma.engine,'PURE_REVELATION_ASMA_V1');
assert.equal(r.destination,'NOT_DETERMINABLE');
console.log('PASS: revelation-derived Asma engine + Mizan boundary');
