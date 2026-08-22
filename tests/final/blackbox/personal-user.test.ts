// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiAnalysis } from '../../../src/ai/general-analyzer.js';
import { createShadowProfile } from '../../../src/shadow/shadow.js';
import { createPublicationRecord, markVerified, markReviewed, proposePublicPublication, publish, MODES } from '../../../src/lifecycle/mode-engine.js';
import { KnowledgeGraph } from '../../../src/knowledge/source-graph.js';

test('black-box: verify a quote request returns actionable analysis', () => {
  const kg=new KnowledgeGraph();
  kg.add({type:'QURAN',title:'Quran',reference:'3:49',text:'example'});
  const r=buildAiAnalysis('Verifikasi quote ini menurut Quran 3:49',{sourceGraph:kg});
  assert.equal(r.intent,'VERIFY_CLAIM');
  assert.ok(Array.isArray(r.actions));
  assert.ok(r.sourceMatches.length>=1);
  assert.ok(r.provenance);
});

test('black-box: create shadow and keep operator separate', () => {
  const s=createShadowProfile({name:'ISA AS',createdBy:'RID-001'});
  assert.equal(s.type,'SHADOW.PROFILE');
  assert.equal(s.createdBy,'RID-001');
  assert.equal(s.name,'ISA AS');
});

test('black-box: publication remains gated', () => {
  let r=createPublicationRecord({ownerId:'RID-001',mode:MODES.PERSONAL});
  assert.throws(()=>publish({...r,publicationStatus:'PUBLIC_CANDIDATE',verified:true,reviewed:true}));
  r={...r,publicationStatus:'PRIVATE_RESEARCH'};
  r=markVerified(r); r=markReviewed(r); r=proposePublicPublication(r); r={...r,mode:MODES.PUBLIC_GUIDE};
  assert.equal(publish(r).publicationStatus,'PUBLISHED');
});
