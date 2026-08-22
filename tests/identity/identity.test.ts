// @ts-nocheck
import assert from 'node:assert/strict';
import { RidEngine } from '../../src/identity/rid-engine.js';
import { IdentityGraph } from '../../src/identity/identity-graph.js';
import { transitionLifeState } from '../../src/identity/life-timeline.js';
const e=new RidEngine({storePath:'/tmp/mw-rid-test.json'}); const p=e.create({displayName:'TEST'}); assert.ok(p.rid&&p.personId&&p.ruhId);
const g=new IdentityGraph(); g.addNode({id:p.rid,type:'RID'}); g.addNode({id:'F1',type:'FAMILY'}); g.link({from:p.rid,to:'F1',relation:'FAMILY'}); assert.equal(g.neighbors(p.rid,'FAMILY').length,1);
assert.equal(transitionLifeState('DUNYA','DYING'),'DYING');
console.log('PASS identity tests');
