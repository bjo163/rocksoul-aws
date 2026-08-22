// @ts-nocheck
import assert from 'node:assert/strict';
import { KnowledgeGraph } from '../../../src/knowledge/source-graph.js';
import { buildAiAnalysis } from '../../../src/ai/general-analyzer.js';
import { LocalStructuredProvider, providerDescriptor } from '../../../src/ai/provider.js';

const kg = new KnowledgeGraph();
const q = kg.add({type:'QURAN',tradition:'ISLAM',title:'Al-Qur\'an',reference:'3:49',text:'demo isa passage',authorityClass:'REVELATION'});
const b = kg.add({type:'BIBLE',tradition:'CHRISTIANITY',title:'Bible',reference:'John 1:1',text:'demo bible passage',authorityClass:'SCRIPTURAL_TEXT'});
kg.link({from:q.knowledgeId,type:'RELATED_TO',to:b.knowledgeId});

const graph = kg.graph(q.knowledgeId);
assert.equal(graph.node.type,'QURAN');
assert.equal(graph.relations.length,1);
assert.equal(kg.search({q:'demo'}).length,2);

const result = buildAiAnalysis('Apakah quote "demo isa passage" benar menurut Quran 3:49?', {sourceGraph:kg});
assert.equal(result.intent,'VERIFY_CLAIM');
assert.ok(result.entities.some(x=>x.type==='RELIGIOUS_TEXT'));
assert.equal(result.claim.referenceCandidates[0],'3:49');
assert.equal(result.sourceMatches.length,1);
assert.equal(result.capability.sourceGrounded,true);

const corruption = buildAiAnalysis('Pejabat menggunakan anggaran rumah sakit untuk keluarganya di Indonesia', {jurisdiction:'ID'});
assert.equal(corruption.intent,'GENERAL_ANALYSIS');
assert.equal(corruption.domainAnalysis?.matched,true);
assert.ok(corruption.semanticVector?.attributes?.length > 0);
assert.ok(corruption.mizan?.xp?.essenceFactor > 0);

const provider = new LocalStructuredProvider((text) => buildAiAnalysis(text, {sourceGraph:kg}));
assert.equal(providerDescriptor(provider).name, 'local-structured');
const provided = await provider.analyze('verifikasi "demo isa passage" dari Quran 3:49');
assert.equal(provided.intent, 'VERIFY_CLAIM');

console.log('PASS: AI general extraction + unified knowledge source graph + provider contract');
