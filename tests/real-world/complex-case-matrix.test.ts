// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiAnalysis } from '../../src/ai/general-analyzer.js';
import { KnowledgeGraph } from '../../src/knowledge/source-graph.js';
import { createCab, createChangeRequest, cabRelations } from '../../src/cab/cab-engine.js';
import { createShadowProfile, createPersonalScenario, scenarioRelations } from '../../src/shadow/shadow.js';
import { buildAnalyticalSemanticVector as buildSemanticVector } from '../../src/semantic/analytical-vector.js';
import { evaluateMizan, calculateXp } from '../../src/engines/mizan.js';
import { ImmutableAuditLedger } from '../../src/audit/immutable-ledger.js';
import { createBaseModel, updateBaseModel, assertBaseModel } from '../../src/models/base-model.js';
import { detectConflicts, resolveConflicts } from '../../src/conflict/rule-conflict.js';
import { replayDecision } from '../../src/replay/decision-replay.js';
import { buildDecisionProvenance } from '../../src/audit/provenance.js';
import { orchestrate } from '../../src/personal/orchestrator/index.js';
import { suggestCabAction } from '../../src/personal/cab-automation/index.js';
import { createMemory, scoreMemory } from '../../src/personal/memory/index.js';
import { buildPersonalLifecycle } from '../../src/personal/e2e/index.js';
import { buildCommandCenter } from '../../src/personal/command-center/index.js';

const HUMAN = 'RID-001';
const BOT = 'BOT-001';
const AI = 'AI-001';

function expectThrows(fn, label) {
  assert.throws(fn, undefined, label);
}

function createFullWorld() {
  const cab = createCab({
    title: 'National Food Security',
    requesterId: HUMAN,
    operatorRid: HUMAN,
    shadowId: HUMAN,
    heroReferenceId: 'PROPHET-YUSUF',
    missionId: 'MISSION-FOOD',
    type: 'PROJECT.CHANGE'
  });
  const change = createChangeRequest({
    cabId: cab.id,
    requestedBy: HUMAN,
    title: 'Build food reserve network',
    affectedTypes: ['EDUCATION.SCHOOL', 'HEALTH.HOSPITAL', 'INFRASTRUCTURE.WATER'],
    projectIds: ['PROJECT-FOOD-001'],
    evidenceIds: ['EVID-FOOD-001'],
    sourceRefs: ['SRC-QURAN-1'],
    risk: { severity: 'HIGH', reversibility: 'PARTIALLY_REVERSIBLE' },
    impact: { scope: 'NATION', reach: 'R8', futureImpact: 'HIGH' }
  });
  const rels = cabRelations({
    cabId: cab.id,
    changeRequestId: change.id,
    operatorRid: HUMAN,
    shadowId: HUMAN,
    heroReferenceId: 'PROPHET-YUSUF',
    missionId: 'MISSION-FOOD',
    projectIds: ['PROJECT-FOOD-001'],
    evidenceIds: ['EVID-FOOD-001'],
    sourceRefs: ['SRC-QURAN-1']
  });
  return { cab, change, rels };
}

test('L5-01: complete personal world lifecycle is complete', () => {
  const lifecycle = buildPersonalLifecycle({rid: HUMAN, steps: [
    'IDENTITY','RELATION','HEALTH','EDUCATION','EMPLOYMENT','INCOME','WEALTH','ASSET',
    'TAX','ZAKAT','KNOWLEDGE','CAB','VERIFICATION','SHADOW','SCENARIO','PROJECT','EVENT','ASMA','MIZAN','XP','AUDIT'
  ]});
  assert.equal(lifecycle.complete, true);
  assert.deepEqual(lifecycle.missing, []);
});

test('L5-02: CAB → Shadow → Hero → Mission → Project chain', () => {
  const { cab, change, rels } = createFullWorld();
  assert.equal(cab.shadowId, HUMAN);
  assert.equal(cab.heroReferenceId, 'PROPHET-YUSUF');
  assert.equal(change.projectIds[0], 'PROJECT-FOOD-001');
  assert.ok(rels.some(r => r.type === 'USES_SHADOW' && r.to === HUMAN));
  assert.ok(rels.some(r => r.type === 'USES_HERO_REFERENCE' && r.to === 'PROPHET-YUSUF'));
  assert.ok(rels.some(r => r.type === 'HAS_MISSION' && r.to === 'MISSION-FOOD'));
  assert.ok(rels.some(r => r.type === 'IMPLEMENTS_INTO_PROJECT' && r.to === 'PROJECT-FOOD-001'));
});

test('L5-03: Shadow role remains operator, Hero remains reference', () => {
  const shadow = createShadowProfile({name:'Operator Shadow', createdBy:HUMAN});
  const scenario = createPersonalScenario({operatorRid:HUMAN, shadowId:shadow.id, missionId:'MISSION-01'});
  const relations = scenarioRelations({scenario, shadowId:shadow.id, missionId:'MISSION-01', projectIds:['PROJECT-01']});
  assert.equal(scenario.operatorRid, HUMAN);
  assert.ok(relations.some(r => r.type === 'USES_SHADOW' && r.to === shadow.id));
  assert.ok(!relations.some(r => r.type === 'USES_HERO_REFERENCE'));
});

test('L5-04: Complex religious claim verification with source graph', () => {
  const graph = new KnowledgeGraph();
  graph.add({type:'QURAN', tradition:'ISLAM', reference:'3:49', text:'Canonical passage A', authorityClass:'REVELATION'});
  graph.add({type:'BIBLE', tradition:'CHRISTIANITY', reference:'John 1:1', text:'Canonical passage B', authorityClass:'REVELATION'});
  graph.add({type:'HADITH', tradition:'ISLAM', collection:'Bukhari', reference:'3448', text:'Hadith text', authorityClass:'PROPHETIC_TRADITION'});
  const analysis = buildAiAnalysis('Verifikasi "Canonical passage A" menurut Quran 3:49.', {sourceGraph:graph, jurisdiction:'ID'});
  assert.equal(analysis.intent, 'VERIFY_CLAIM');
  assert.ok(analysis.sourceMatches.length >= 1);
  assert.ok(analysis.provenance);
  assert.ok(analysis.confidence.score >= 0);
});

test('L5-05: Cross-tradition knowledge comparison uses one schema', () => {
  const graph = new KnowledgeGraph();
  const q = graph.add({type:'QURAN', tradition:'ISLAM', reference:'3:49', text:'A'});
  const b = graph.add({type:'BIBLE', tradition:'CHRISTIANITY', reference:'John 1:1', text:'B'});
  const h = graph.add({type:'HADITH', tradition:'ISLAM', reference:'3448', text:'C'});
  assert.equal(q.type, 'QURAN');
  assert.equal(b.type, 'BIBLE');
  assert.equal(h.type, 'HADITH');
  assert.ok(q.knowledgeId && b.knowledgeId && h.knowledgeId);
});

test('L5-06: Conflicting same-authority rules remain unresolved', () => {
  const result = resolveConflicts([
    {ruleId:'R1', key:'X', jurisdiction:'ID', effect:'ALLOW', authorityClass:'STATUTE', priority:10},
    {ruleId:'R2', key:'X', jurisdiction:'ID', effect:'DENY', authorityClass:'STATUTE', priority:10}
  ], {jurisdiction:'ID', asOf:'2026-08-19'});
  assert.equal(result.status, 'UNRESOLVED');
  assert.equal(result.selected, null);
});

test('L5-07: Higher authority resolves conflicting rules', () => {
  const result = resolveConflicts([
    {ruleId:'R1', key:'X', jurisdiction:'ID', effect:'ALLOW', authorityClass:'OFFICIAL_GUIDANCE', priority:10},
    {ruleId:'R2', key:'X', jurisdiction:'ID', effect:'DENY', authorityClass:'STATUTE', priority:10}
  ], {jurisdiction:'ID', asOf:'2026-08-19'});
  assert.equal(result.status, 'ACTUAL_CONFLICT');
  assert.equal(result.selected.ruleId, 'R2');
});

test('L5-08: Jurisdiction and effective date prune candidates', () => {
  const result = resolveConflicts([
    {ruleId:'OLD-ID', key:'X', jurisdiction:'ID', effect:'ALLOW', effectiveTo:'2025-12-31', authorityClass:'STATUTE'},
    {ruleId:'NEW-ID', key:'X', jurisdiction:'ID', effect:'DENY', effectiveFrom:'2026-01-01', authorityClass:'STATUTE'},
    {ruleId:'SG', key:'X', jurisdiction:'SG', effect:'ALLOW', effectiveFrom:'2020-01-01', authorityClass:'STATUTE'}
  ], {jurisdiction:'ID', asOf:'2026-08-19'});
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].ruleId, 'NEW-ID');
});

test('L5-09: National systemic action increases Mizan/XP magnitude over personal', () => {
  const v = buildSemanticVector({primary:[39], secondary:[51,40], mode:'DEVIATION'});
  const personal = evaluateMizan({semantic:{R:1,G:0.3,B:0.3,L:0.1}, semanticVector:v, scale:{scope:'SELF',reach:'R1',depth:'D1',duration:'SHORT',power:'PERSONAL',systemicity:'INDIVIDUAL'}});
  const national = evaluateMizan({semantic:{R:1,G:0.3,B:0.3,L:0.1}, semanticVector:v, scale:{scope:'NATION',reach:'R8',depth:'D6',duration:'INTERGENERATIONAL',power:'NATIONAL_OFFICIAL',systemicity:'NATIONAL_SYSTEM',futureImpact:'HIGH'}});
  assert.ok(national.xp.deviationScore > personal.xp.deviationScore);
  assert.ok(national.scaleFactor > personal.scaleFactor);
});

test('L5-10: Positive verification produces positive XP and no deviation', () => {
  const v = buildSemanticVector({primary:[51], secondary:[50,19,40], mode:'REFLECTION'});
  const xp = calculateXp({semanticVector:v, scale:{scope:'COMMUNITY',reach:'R4',depth:'D2',duration:'SHORT',evidence:'HIGH',socialImpact:'HIGH'}, factors:{quality:0.95,intent:1,context:0.95}});
  assert.ok(xp.positiveXp > 0);
  assert.equal(xp.deviationScore, 0);
  assert.ok(xp.totalXp > 0);
});

test('L5-11: Immutable audit chain survives multi-actor writes', () => {
  const ledger = new ImmutableAuditLedger();
  ledger.append({eventType:'CAB_CREATED', actorId:HUMAN, entityId:'CAB-1'});
  ledger.append({eventType:'AI_ANALYZED', actorId:AI, entityId:'CAB-1', provenance:['SRC-1']});
  ledger.append({eventType:'BOT_UPDATED', actorId:BOT, entityId:'CAB-1'});
  assert.equal(ledger.verify().ok, true);
  assert.equal(ledger.verify().count, 3);
});

test('L5-12: Tampered middle event breaks chain', () => {
  const ledger = new ImmutableAuditLedger();
  ledger.append({eventType:'A', actorId:HUMAN, payload:{x:1}});
  ledger.append({eventType:'B', actorId:BOT, payload:{x:2}});
  ledger.append({eventType:'C', actorId:AI, payload:{x:3}});
  ledger.entries[1].payload.x = 999;
  assert.equal(ledger.verify().ok, false);
});

test('L5-13: Decision provenance includes source, claim, rule and model versions', () => {
  const p = buildDecisionProvenance({
    sources:[{knowledgeId:'SRC-1',reference:'3:49'}],
    claims:[{claimId:'CLAIM-1',confidence:0.88}],
    rules:[{ruleId:'RULE-1',authorityClass:'STATUTE',version:3}],
    model:{id:'local-structured',version:'3.0.6',confidence:0.82}
  });
  assert.ok(Array.isArray(p.links));
  assert.equal(p.links.filter(x=>x.kind==='KNOWLEDGE').length,1);
  assert.equal(p.links.filter(x=>x.kind==='CLAIM').length,1);
  assert.equal(p.links.filter(x=>x.kind==='RULE').length,1);
  assert.equal(p.links.find(x=>x.kind==='MODEL')?.version, '3.0.6');
});

test('L5-14: Replay detects decision changes', () => {
  const before = {intent:'VERIFY_CLAIM', confidence:{score:0.6}};
  const replay = replayDecision({input:'verify quote', analyze:()=>({intent:'VERIFY_CLAIM', confidence:{score:0.9}}), historicalResult:before});
  assert.equal(replay.changed, true);
  assert.ok(replay.diff.length > 0);
});

test('L5-15: Personal orchestrator selects finance from mixed input', () => {
  const result = orchestrate('Catat gaji, pajak, dan zakat bulan ini.', {availableTypes:['FINANCE.INCOME','FINANCE.TAX','FINANCE.ZAKAT','HEALTH.CARE']});
  assert.equal(result.intent, 'FINANCE');
  assert.ok(result.recommendedCapabilities.includes('FINANCE.INCOME'));
});

test('L5-16: CAB automation never self-approves', () => {
  const result = suggestCabAction('Need to change education rules', {affectedTypes:['EDUCATION.SCHOOL'], risk:'HIGH'});
  assert.equal(result.next, 'CAB_REVIEW');
  assert.equal(result.changeRequest.requiresReview, true);
});

test('L5-17: Memory confidence decays but never below zero', () => {
  const m = createMemory({memoryId:'MEM-1',rid:HUMAN,content:'Known fact',confidence:0.7});
  assert.equal(scoreMemory(m,{decay:0.9}), 0);
});

test('L5-18: Command center exposes CAB, verification, mission, project, XP and audit', () => {
  const cc = buildCommandCenter({rid:HUMAN,cabInbox:['CAB-1'],verification:['V-1'],missions:['M-1'],projects:['P-1'],timeline:['E-1'],xp:{totalXp:100},audit:{integrity:true}});
  assert.deepEqual(Object.keys(cc.sections), ['cabInbox','verification','missions','projects','timeline','xp','audit']);
  assert.equal(cc.health.ok, true);
});

test('L5-19: Base model rejects empty actor', () => {
  expectThrows(() => createBaseModel({id:'X',type:'TEST',createdBy:''}), 'empty actor');
});

test('L5-20: Base model rejects invalid actor type object', () => {
  expectThrows(() => createBaseModel({id:'X',type:'TEST',createdBy:{actorType:'ALIEN',actorId:'A'}}), 'invalid actor');
});

test('L5-21: Base model version increments on update', () => {
  const r = createBaseModel({id:'X',type:'TEST',createdBy:HUMAN});
  const u = updateBaseModel(r,{updatedBy:BOT,patch:{data:{x:1}}});
  assert.equal(u.version, 2);
  assert.equal(u.updatedBy, BOT);
});

test('L5-22: REAL personal scenario rejects removed simulation mode', () => {
  const s = createPersonalScenario({operatorRid:HUMAN,mode:'REAL',shadowId:'SHD-1'});
  assert.equal(s.mode,'REAL');
  expectThrows(() => createPersonalScenario({operatorRid:HUMAN,mode:'SIMULATION'}), 'simulation removed');
});

test('L5-23: Unknown verification source remains uncertain', () => {
  const analysis = buildAiAnalysis('Apakah "mistery text" benar menurut Quran 88:88?', {sourceGraph:new KnowledgeGraph()});
  assert.equal(analysis.intent,'VERIFY_CLAIM');
  assert.equal(analysis.sourceMatches.length,0);
  assert.equal(analysis.capability.needsHumanReview,true);
});

test('L5-24: Cross-tradition same reference schema can coexist without collision', () => {
  const graph = new KnowledgeGraph();
  const q = graph.add({type:'QURAN',tradition:'ISLAM',reference:'1:1',text:'Q'});
  const b = graph.add({type:'BIBLE',tradition:'CHRISTIANITY',reference:'1:1',text:'B'});
  assert.notEqual(q.knowledgeId,b.knowledgeId);
  assert.equal(graph.search({reference:'1:1'}).length,2);
});

test('L5-25: High-risk public project remains reviewable through CAB', () => {
  const c = createCab({title:'Public Hospital AI',requesterId:HUMAN,operatorRid:HUMAN,type:'PROJECT.CHANGE'});
  const cr = createChangeRequest({cabId:c.id,requestedBy:HUMAN,title:'Deploy AI triage',risk:{severity:'CRITICAL'},affectedTypes:['HEALTH.CLINICAL_EVENT']});
  assert.equal(cr.decision,null);
  const relations = cabRelations({cabId:c.id,changeRequestId:cr.id,projectIds:['PROJECT-HOSPITAL-AI']});
  assert.ok(relations.some(r=>r.type==='IMPLEMENTS_INTO_PROJECT'));
});

// Generated combinatorial stress cases across scopes × modes × domains.
const scopes = ['SELF','COMMUNITY','CITY','REGION','NATION','GLOBAL'];
const modes = ['REFLECTION','DEVIATION'];
const semanticPairs = [
  [[51],[50,19]],
  [[39],[51,40]],
  [[40],[51,19]],
  [[17],[30,56]],
  [[7],[8,9]],
  [[31],[39,52]]
];
let generated = 0;
for (const scope of scopes) {
  for (const mode of modes) {
    for (const [primary, secondary] of semanticPairs) {
      generated += 1;
      test(`L3-combinatorial-${scope}-${mode}-${generated}`, () => {
        const v = buildSemanticVector({primary,secondary,mode});
        const m = evaluateMizan({
          semantic:{R:0.8,G:0.7,B:0.6,L:0.7},
          semanticVector:v,
          scale:{scope,reach:scope==='GLOBAL'?'R10':scope==='NATION'?'R7':scope==='REGION'?'R5':scope==='CITY'?'R4':scope==='COMMUNITY'?'R3':'R1',depth:mode==='DEVIATION'?'D4':'D2',duration:scope==='GLOBAL'?'LONG':'SHORT',power:scope==='NATION'?'NATIONAL_OFFICIAL':'PERSONAL',systemicity:scope==='NATION'?'NATIONAL_SYSTEM':'INDIVIDUAL'}
        });
        assert.equal(m.modelOnly,true);
        assert.ok(m.scaleFactor > 0);
        if (mode==='DEVIATION') assert.ok(m.xp.deviationScore > 0);
        else assert.ok(m.xp.positiveXp >= 0);
      });
    }
  }
}

test('L3-combinatorial inventory', () => assert.equal(generated, 72));

const adversarial = [
  ['empty-ai-input', () => buildAiAnalysis(''), r => r.intent==='GENERAL_ANALYSIS'],
  ['unknown-source-type-rejected', () => new KnowledgeGraph().add({type:'ALIEN_BOOK',text:'x'}), null],
  ['cab-missing-title', () => createCab({requesterId:HUMAN}), null],
  ['cr-missing-cab', () => createChangeRequest({requestedBy:HUMAN,title:'x'}), null],
  ['scenario-missing-operator', () => createPersonalScenario({}), null],
  ['invalid-model-version', () => assertBaseModel({...createBaseModel({id:'X',type:'T',createdBy:HUMAN}),version:0}), null],
  ['invalid-rule-jurisdiction-no-candidate', () => resolveConflicts([{ruleId:'SG',jurisdiction:'SG',effect:'ALLOW'}],{jurisdiction:'ID'}), r=>r.selected===null && r.candidates.length===0],
];
for (const [name, fn, predicate] of adversarial) {
  test(`L4-adversarial-${name}`, () => {
    if (!predicate) expectThrows(fn,name);
    else assert.ok(predicate(fn()));
  });
}

test('L4-adversarial-tamper-after-three-events', () => {
  const l=new ImmutableAuditLedger();
  for(let i=0;i<5;i++) l.append({eventType:'STEP',actorId:i%2?BOT:HUMAN,payload:{i}});
  l.entries[2].payload.i=777;
  assert.equal(l.verify().ok,false);
});

test('L4-adversarial-conflicting-authorities-unresolved-only-when-equal', () => {
  const high=resolveConflicts([
    {ruleId:'A',key:'X',jurisdiction:'ID',effect:'ALLOW',authorityClass:'STATUTE',priority:1},
    {ruleId:'B',key:'X',jurisdiction:'ID',effect:'DENY',authorityClass:'OFFICIAL_GUIDANCE',priority:1}
  ],{jurisdiction:'ID'});
  assert.equal(high.selected.ruleId,'A');
  const equal=resolveConflicts([
    {ruleId:'A',key:'X',jurisdiction:'ID',effect:'ALLOW',authorityClass:'STATUTE',priority:1},
    {ruleId:'B',key:'X',jurisdiction:'ID',effect:'DENY',authorityClass:'STATUTE',priority:1}
  ],{jurisdiction:'ID'});
  assert.equal(equal.selected,null);
});

test('L5-supercase: corruption knowledge claim → national Mizan → CAB → project → audit', () => {
  const graph = new KnowledgeGraph();
  const src = graph.add({type:'LEGAL_TEXT',tradition:'CIVIC',reference:'STATUTE-ANTI-CORRUPTION-1',text:'Public funds must not be diverted for personal benefit',authorityClass:'STATUTE'});
  const analysis = buildAiAnalysis('Pejabat menggunakan dana rumah sakit untuk keluarganya di tingkat nasional.', {sourceGraph:graph,jurisdiction:'ID'});
  const vector = analysis.semanticVector;
  assert.equal(analysis.actions[0].action,'CORRUPTION');
  assert.ok(vector?.semanticReady);
  const m = evaluateMizan({semantic:analysis.domainAnalysis.semantic.vector,semanticVector:vector,scale:{scope:'NATION',reach:'R8',depth:'D6',duration:'INTERGENERATIONAL',power:'NATIONAL_OFFICIAL',systemicity:'NATIONAL_SYSTEM',futureImpact:'HIGH'},factors:{mode:'DEVIATION'}});
  assert.ok(m.xp.deviationScore>0);
  const cab = createCab({title:'Investigate public-funds misuse',requesterId:HUMAN,operatorRid:HUMAN,shadowId:HUMAN,heroReferenceId:'PROPHET-ISA',missionId:'MISSION-JUSTICE',type:'CHANGE.REQUEST'});
  const cr = createChangeRequest({cabId:cab.id,requestedBy:HUMAN,title:'Investigate and repair misuse',affectedRuleIds:[src.reference],projectIds:['PROJECT-JUSTICE-001'],risk:{severity:'CRITICAL'},impact:{scope:'NATION'}});
  const rels = cabRelations({cabId:cab.id,changeRequestId:cr.id,shadowId:HUMAN,heroReferenceId:'PROPHET-ISA',missionId:'MISSION-JUSTICE',projectIds:cr.projectIds,sourceRefs:[src.knowledgeId]});
  const ledger = new ImmutableAuditLedger();
  ledger.append({eventType:'CLAIM_ANALYZED',actorId:AI,entityId:cab.id,provenance:[src.knowledgeId],modelVersion:'3.0.6'});
  ledger.append({eventType:'CAB_CREATED',actorId:HUMAN,entityId:cab.id,provenance:rels});
  ledger.append({eventType:'PROJECT_LINKED',actorId:HUMAN,entityId:'PROJECT-JUSTICE-001'});
  assert.ok(rels.some(r=>r.type==='USES_HERO_REFERENCE'));
  assert.ok(rels.some(r=>r.type==='IMPLEMENTS_INTO_PROJECT'));
  assert.equal(ledger.verify().ok,true);
});

test('L5-supercase: verification claim stays private until publication gate', () => {
  const g = new KnowledgeGraph();
  g.add({type:'QURAN',tradition:'ISLAM',reference:'3:49',text:'Verified text',authorityClass:'REVELATION'});
  const a = buildAiAnalysis('Verifikasi "Verified text" menurut Quran 3:49.', {sourceGraph:g});
  assert.equal(a.capability.needsHumanReview,true);
  const claim = createBaseModel({id:'CLAIM-PRIVATE-1',type:'KNOWLEDGE.CLAIM',createdBy:HUMAN});
  assert.equal(claim.visibility,'PRIVATE');
  assert.equal(claim.status,'ACTIVE');
});

test('L5-supercase: actor chain HUMAN → AI → BOT → SYSTEM', () => {
  const l = new ImmutableAuditLedger();
  l.append({eventType:'INPUT',actorId:HUMAN,entityId:'CASE-1'});
  l.append({eventType:'ANALYSIS',actorId:AI,entityId:'CASE-1'});
  l.append({eventType:'AUTOMATION',actorId:BOT,entityId:'CASE-1'});
  l.append({eventType:'SYSTEM_CHECK',actorId:'SYSTEM-001',entityId:'CASE-1'});
  assert.equal(l.verify().ok,true);
  assert.deepEqual(l.history('CASE-1').map(x=>x.actorId),[HUMAN,AI,BOT,'SYSTEM-001']);
});

test('L5-supercase: replay produces explicit diff rather than silent overwrite', () => {
  const before={intent:'VERIFY_CLAIM',confidence:{score:0.7},mizan:{raw:10}};
  const replay = replayDecision({input:'verify claim',analyze:()=>({intent:'VERIFY_CLAIM',confidence:{score:0.9},mizan:{raw:18}}),historicalResult:before});
  assert.equal(replay.changed,true);
  assert.ok(replay.diff.some(d=>d.path==='confidence'));
  assert.ok(replay.diff.some(d=>d.path==='mizan'));
});
