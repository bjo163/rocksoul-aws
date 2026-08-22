// @ts-nocheck
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BackendRuntime, AuditLedger, EventBus } from '../../../src/backend/index.js';
import {registerCoreDomainTypes} from '../../../src/backend/domain-types.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(),'mw-v24-'));
const rt = new BackendRuntime({dataDir:dir, rules:[{ruleId:'IDN-1',jurisdiction:'ID',category:'PUBLIC',key:'OPEN',effectiveFrom:'2026-01-01',priority:10,status:'ACTIVE',perspective:'B'}]});
registerCoreDomainTypes(rt);
assert.equal(rt.types.get('HEALTH.HOSPITAL').entityFamily,'ENTITY');
const person = await rt.createEntity({entityId:'RID-TEST',type:'PERSON',data:{name:'Test'}});
const org = await rt.createEntity({entityId:'ORG-TEST',type:'ORGANIZATION',data:{name:'Test Org'}});
const rel = await rt.createRelation({from:person.entityId,type:'WORKS_FOR',to:org.entityId});
const event = await rt.appendEvent({type:'EMPLOYMENT.START',actor:person.entityId,subject:org.entityId,context:{}});
assert.equal(rel.from, 'RID-TEST');
assert.equal(event.actor, 'RID-TEST');
assert.equal(rt.resolveRule({jurisdiction:'ID',category:'PUBLIC',key:'OPEN'}).winner.ruleId,'IDN-1');
assert.equal(rt.health().ok,true);
assert.equal(rt.graph.integrity().ok,true);
assert.equal(rt.ledger.verify().ok,true);

const bus = new EventBus(); let seen=0; bus.subscribe('PING', ()=>{seen+=1;}); await bus.publish({type:'PING'}); assert.equal(seen,1);
const ledger = new AuditLedger(); ledger.append({type:'TEST'}); assert.equal(ledger.verify().ok,true);
console.log('PASS: v2.4 backend kernel 9 assertions');
