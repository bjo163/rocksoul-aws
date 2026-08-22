// @ts-nocheck
import assert from 'node:assert/strict';
import { ImmutableAuditLedger, hashPayload } from '../../../src/audit/immutable-ledger.js';
import { buildDecisionProvenance } from '../../../src/audit/provenance.js';
import { replayDecision } from '../../../src/replay/decision-replay.js';
import { KnowledgeGraph } from '../../../src/knowledge/source-graph.js';
import { buildAiAnalysis } from '../../../src/ai/general-analyzer.js';

const ledger=new ImmutableAuditLedger();
const e1=ledger.append({eventType:'CREATE',entityId:'RID-1',payload:{a:1}});
ledger.append({eventType:'UPDATE',entityId:'RID-1',payload:{a:2}});
assert.equal(ledger.verify().ok,true);
const snap=ledger.snapshot(); assert.equal(snap.integrity.ok,true);
const tampered=snap.entries.map(x=>({...x})); tampered[0].payload={a:999}; const bad=new ImmutableAuditLedger({entries:tampered}); assert.equal(bad.verify().ok,false);
assert.equal(typeof hashPayload({a:1}),'string');
const prov=buildDecisionProvenance({sources:[{knowledgeId:'K1',type:'QURAN',authorityClass:'REVELATION',version:'v1'}],rules:[{ruleId:'R1',authorityClass:'STATUTE',version:'2026'}],model:{id:'ai',version:'2.15'}});
assert.equal(prov.links.length,3);
const replay=replayDecision({input:'x',historicalResult:{a:1},analyze:()=>({a:2})}); assert.equal(replay.changed,true); assert.equal(replay.diff[0].path,'a');
const kg=new KnowledgeGraph(); kg.add({type:'QURAN',tradition:'ISLAM',title:"Al-Qur'an",reference:'3:49',text:'demo',authorityClass:'REVELATION'});
const result=buildAiAnalysis('Apakah quote "demo" benar menurut Quran 3:49?',{sourceGraph:kg});
assert.ok(result.confidence?.score > 0); assert.ok(result.provenance?.links?.length>=1); assert.ok(result.ruleResolution);
console.log('PASS: immutable audit, provenance, replay, and AI integration');
