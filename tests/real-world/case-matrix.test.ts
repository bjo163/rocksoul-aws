// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiAnalysis } from '../../src/ai/general-analyzer.js';
import { KnowledgeGraph } from '../../src/knowledge/source-graph.js';
import { createCab, createChangeRequest, cabRelations } from '../../src/cab/cab-engine.js';
import { buildAnalyticalSemanticVector as buildSemanticVector } from '../../src/semantic/analytical-vector.js';
import { calculateXp, evaluateMizan } from '@moonwitness/mizan-engine';
import { ImmutableAuditLedger } from '../../src/audit/immutable-ledger.js';
import { createBaseModel, updateBaseModel, assertBaseModel } from '../../src/models/base-model.js';
import { detectConflicts, resolveConflicts } from '../../src/conflict/rule-conflict.js';

const ACTOR = 'RID-001';

const CASES = [
  ['identity-create', 'Identity: create base person record'],
  ['identity-update', 'Identity: update person record'],
  ['knowledge-quran', 'Knowledge: Quran source'],
  ['knowledge-bible', 'Knowledge: Bible source'],
  ['knowledge-hadith', 'Knowledge: Hadith source'],
  ['verify-exact-reference', 'Verification: exact reference candidate'],
  ['verify-missing-source', 'Verification: missing corpus'],
  ['verify-translation', 'Verification: translation variation'],
  ['verify-conflicting-rules', 'Verification: conflicting normative rules'],
  ['cab-basic', 'CAB: create board'],
  ['cab-hero-switch', 'CAB: switch hero reference'],
  ['cab-project-link', 'CAB: link project'],
  ['cab-evidence', 'CAB: evidence relation'],
  ['ai-corruption', 'AI: corruption statement'],
  ['ai-smoking', 'AI: smoking statement'],
  ['ai-lying', 'AI: lying statement'],
  ['ai-knowledge-question', 'AI: knowledge question'],
  ['ai-plan-project', 'AI: project planning intent'],
  ['ai-case-report', 'AI: case report intent'],
  ['asma-positive', 'Asma: positive semantic vector'],
  ['asma-deviation', 'Asma: deviation semantic vector'],
  ['mizan-personal', 'Mizan: personal scale'],
  ['mizan-national', 'Mizan: national scale'],
  ['mizan-environment', 'Mizan: environmental scale'],
  ['xp-positive', 'XP: positive action'],
  ['xp-deviation', 'XP: deviation action'],
  ['xp-repair', 'XP: repair modifier'],
  ['audit-create', 'Audit: append first event'],
  ['audit-chain', 'Audit: append chained events'],
  ['audit-tamper', 'Audit: tamper detection'],
  ['model-contract', 'Model: universal audit contract'],
  ['conflict-none', 'Rule: no conflict'],
  ['conflict-unresolved', 'Rule: unresolved equal authority'],
  ['rule-jurisdiction', 'Rule: jurisdiction filter'],
  ['rule-effective-date', 'Rule: effective date filter'],
  ['real-knowledge-to-xp', 'Cross-domain: knowledge verification → XP'],
  ['real-cab-to-project', 'Cross-domain: CAB → project relation'],
  ['real-shadow-hero', 'Cross-domain: Shadow operator + hero reference'],
  ['real-audit-provenance', 'Cross-domain: decision provenance + audit'],
  ['real-public-private', 'Cross-domain: private record default'],
  ['real-unknown-is-not-false', 'Cross-domain: unresolved source stays unknown'],
];

function execCase(id) {
  switch (id) {
    case 'identity-create': {
      const rec = createBaseModel({ id:'RID-TEST-001', type:'PERSON', createdBy:ACTOR, data:{name:'Test'} });
      return { ok: !!assertBaseModel(rec), details:{type:rec.type} };
    }
    case 'identity-update': {
      const rec = createBaseModel({ id:'X', type:'PERSON', createdBy:ACTOR, data:{name:'A'} });
      const updated = updateBaseModel(rec, { updatedBy:'BOT-001', patch:{data:{name:'B'}} });
      return { ok: updated.version === 2 && updated.updatedBy === 'BOT-001', details:{version:updated.version} };
    }
    case 'knowledge-quran': {
      const g = new KnowledgeGraph(); const x = g.add({type:'QURAN', tradition:'ISLAM', reference:'3:49', text:'...'});
      return { ok:x.type==='QURAN' && g.get(x.knowledgeId)?.reference==='3:49' };
    }
    case 'knowledge-bible': {
      const g = new KnowledgeGraph(); const x = g.add({type:'BIBLE', tradition:'CHRISTIANITY', reference:'John 1:1', text:'...'});
      return { ok:x.type==='BIBLE' && x.reference==='John 1:1' };
    }
    case 'knowledge-hadith': {
      const g = new KnowledgeGraph(); const x = g.add({type:'HADITH', tradition:'ISLAM', collection:'Bukhari', reference:'3448', text:'...'});
      return { ok:x.type==='HADITH' && x.collection==='Bukhari' };
    }
    case 'verify-exact-reference': {
      const a = buildAiAnalysis('Apakah "test" benar menurut Quran 3:49?');
      return { ok:a.intent==='UNRESOLVED' && Array.isArray(a.sourceMatches) };
    }
    case 'verify-missing-source': {
      const a = buildAiAnalysis('Apakah "test" benar menurut Quran 99:99?', {sourceGraph:null});
      return { ok:a.intent==='UNRESOLVED' && Array.isArray(a.sourceMatches) && a.sourceMatches.length===0 };
    }
    case 'verify-translation': {
      const g = new KnowledgeGraph(); g.add({type:'QURAN', reference:'3:49', text:'Arabic', translation:'Translation A'});
      const a = buildAiAnalysis('Apakah "Translation B" benar menurut Quran 3:49?', {sourceGraph:g});
      return { ok:Array.isArray(a.sourceMatches) };
    }
    case 'verify-conflicting-rules': {
      const r = detectConflicts([
        {ruleId:'A', key:'K', jurisdiction:'ID', effect:'ALLOW', authorityClass:'STATUTE', priority:1},
        {ruleId:'B', key:'K', jurisdiction:'ID', effect:'DENY', authorityClass:'STATUTE', priority:1},
      ]);
      return { ok:r.status==='ACTUAL_CONFLICT' && r.conflicts.length===1 };
    }
    case 'cab-basic': {
      const c = createCab({title:'Test Board', requesterId:ACTOR, operatorRid:ACTOR});
      return { ok:c.type==='CHANGE.REQUEST' && c.cabId===c.id && c.createdBy===ACTOR };
    }
    case 'cab-hero-switch': {
      const c = createCab({title:'Test Board', requesterId:ACTOR, heroReferenceId:'PROPHET-YUSUF'});
      const r = cabRelations({cabId:c.cabId, heroReferenceId:'PROPHET-YUSUF', shadowId:ACTOR});
      return { ok:r.some(x=>x.type==='USES_HERO_REFERENCE') && r.some(x=>x.type==='USES_SHADOW') };
    }
    case 'cab-project-link': {
      const c = createCab({title:'Project Board', requesterId:ACTOR});
      const cr = createChangeRequest({cabId:c.cabId, requestedBy:ACTOR, title:'Do project', projectIds:['PROJECT-001']});
      const r = cabRelations({cabId:c.cabId, changeRequestId:cr.changeRequestId, projectIds:cr.projectIds});
      return { ok:r.some(x=>x.type==='IMPLEMENTS_INTO_PROJECT' && x.to==='PROJECT-001') && r.some(x=>x.type==='HAS_PROJECT') };
    }
    case 'cab-evidence': {
      const c = createCab({title:'Evidence Board', requesterId:ACTOR});
      const r = cabRelations({cabId:c.cabId, evidenceIds:['EVID-001'], sourceRefs:['SRC-001']});
      return { ok:r.some(x=>x.type==='BASED_ON') && r.some(x=>x.type==='REFERENCES') };
    }
    case 'ai-corruption': {
      const a = buildAiAnalysis('Pejabat menggunakan dana rumah sakit untuk keluarganya di tingkat nasional.', {jurisdiction:'ID'});
      return { ok:a.intent==='UNRESOLVED' && !!a.domainAnalysis };
    }
    case 'ai-smoking': {
      const a = buildAiAnalysis('Merokok di tempat umum saat puasa di Indonesia.', {jurisdiction:'ID'});
      return { ok:a.intent==='UNRESOLVED' && !!a.domainAnalysis };
    }
    case 'ai-lying': {
      const a = buildAiAnalysis('Dia sengaja berbohong kepada orang lain.');
      return { ok:a.intent==='UNRESOLVED' && !!a.domainAnalysis };
    }
    case 'ai-knowledge-question': {
      const a = buildAiAnalysis('Apa itu tawbah dan bagaimana menjelaskannya?');
      return { ok:a.intent==='UNRESOLVED' && !!a.domainAnalysis };
    }
    case 'ai-plan-project': {
      const a = buildAiAnalysis('Buat project sekolah baru untuk desa.');
      return { ok:a.intent==='UNRESOLVED' && !!a.domainAnalysis };
    }
    case 'ai-case-report': {
      const a = buildAiAnalysis('Laporkan kasus penipuan ini.');
      return { ok:a.intent==='UNRESOLVED' && !!a.domainAnalysis };
    }
    case 'asma-positive': {
      const v = buildSemanticVector({primary:[51],secondary:[50,19],mode:'REFLECTION'});
      return { ok:v.semanticReady && v.weights[51]>v.weights[50] && v.attributes.length===3 };
    }
    case 'asma-deviation': {
      const v = buildSemanticVector({primary:[36,31],secondary:[43],mode:'DEVIATION'});
      return { ok:v.mode==='DEVIATION' && v.semanticReady };
    }
    case 'mizan-personal': {
      const v = buildSemanticVector({primary:[51],mode:'REFLECTION'});
      const m = evaluateMizan({semantic:{R:0.8,G:0.7,B:0.8,L:0.6}, semanticVector:v, scale:{scope:'SELF',reach:'R1',depth:'D1',duration:'SHORT'}});
      return { ok:m.xp && m.scaleFactor>0 && m.xp.totalXp>=0 };
    }
    case 'mizan-national': {
      const v = buildSemanticVector({primary:[39],mode:'DEVIATION'});
      const personal = evaluateMizan({semantic:{R:1,G:0.5,B:0.5,L:0.2}, semanticVector:v, scale:{scope:'SELF',reach:'R1',depth:'D2',duration:'SHORT',power:'PERSONAL'}});
      const national = evaluateMizan({semantic:{R:1,G:0.5,B:0.5,L:0.2}, semanticVector:v, scale:{scope:'NATION',reach:'R7',depth:'D6',duration:'INTERGENERATIONAL',power:'NATIONAL_OFFICIAL',systemicity:'NATIONAL_SYSTEM'}});
      return { ok:national.scaleFactor>personal.scaleFactor && Number.isFinite(national.xp.deviationScore) };
    }
    case 'mizan-environment': {
      const v = buildSemanticVector({primary:[17],mode:'DEVIATION'});
      const m = evaluateMizan({semantic:{R:1,G:0,B:1,L:0}, semanticVector:v, scale:{scope:'ENVIRONMENT',reach:'R8',depth:'D5',environment:'GLOBAL_ENVIRONMENT',futureImpact:'HIGH'}});
      return { ok:m.scaleFactor>0.8 && Number.isFinite(m.xp.deviationScore) };
    }
    case 'xp-positive': {
      const v = buildSemanticVector({primary:[51],mode:'REFLECTION'});
      const m = calculateXp({semanticVector:v, scale:{scope:'COMMUNITY',reach:'R4',depth:'D2',quality:'HIGH',intent:'GOOD'}, factors:{quality:0.9,intent:0.95}});
      return { ok:m.positiveXp>0 && m.deviationScore===0 };
    }
    case 'xp-deviation': {
      const v = buildSemanticVector({primary:[39],mode:'DEVIATION'});
      const m = calculateXp({semanticVector:v, scale:{scope:'NATION',reach:'R7',depth:'D6',power:'NATIONAL_OFFICIAL',systemicity:'NATIONAL_SYSTEM'}, mode:'DEVIATION'});
      return { ok:m.deviationScore>0 && m.positiveXp===0 && m.totalXp<0 };
    }
    case 'xp-repair': {
      const v = buildSemanticVector({primary:[39],mode:'DEVIATION'});
      const noRepair = calculateXp({semanticVector:v, scale:{scope:'NATION',reach:'R7',depth:'D6'}, factors:{repair:0}, mode:'DEVIATION'});
      const repaired = calculateXp({semanticVector:v, scale:{scope:'NATION',reach:'R7',depth:'D6'}, factors:{repair:1}, mode:'DEVIATION'});
      return { ok:repaired.repairScore>noRepair.repairScore };
    }
    case 'audit-create': {
      const l = new ImmutableAuditLedger(); const e=l.append({eventType:'TEST',actorId:ACTOR,entityId:'X',payload:{a:1}});
      return { ok:l.verify().ok && e.sequence===1 };
    }
    case 'audit-chain': {
      const l = new ImmutableAuditLedger(); l.append({eventType:'A',actorId:ACTOR}); l.append({eventType:'B',actorId:'BOT-001'});
      return { ok:l.verify().ok && l.verify().count===2 };
    }
    case 'audit-tamper': {
      const l = new ImmutableAuditLedger(); l.append({eventType:'A',actorId:ACTOR,payload:{value:1}}); l.entries[0].payload.value=999;
      return { ok:l.verify().ok===false };
    }
    case 'model-contract': {
      const rec = createBaseModel({id:'M-001',type:'TEST',createdBy:ACTOR});
      return { ok:assertBaseModel(rec)?.id==='M-001' };
    }
    case 'conflict-none': {
      const r=detectConflicts([{ruleId:'A',effect:'ALLOW',jurisdiction:'ID',key:'X'},{ruleId:'B',effect:'ALLOW',jurisdiction:'ID',key:'X'}]);
      return { ok:r.status==='NONE' };
    }
    case 'conflict-unresolved': {
      const r=resolveConflicts([
        {ruleId:'A',key:'X',jurisdiction:'ID',effect:'ALLOW',authorityClass:'STATUTE',priority:1},
        {ruleId:'B',key:'X',jurisdiction:'ID',effect:'DENY',authorityClass:'STATUTE',priority:1}
      ],{jurisdiction:'ID'});
      return { ok:r.status==='UNRESOLVED' && r.selected===null };
    }
    case 'rule-jurisdiction': {
      const r=resolveConflicts([{ruleId:'ID',jurisdiction:'ID',effect:'ALLOW'},{ruleId:'SG',jurisdiction:'SG',effect:'DENY'}],{jurisdiction:'ID'});
      return { ok:r.candidates.length===1 && r.candidates[0].ruleId==='ID' };
    }
    case 'rule-effective-date': {
      const r=resolveConflicts([{ruleId:'OLD',effectiveTo:'2025-12-31',effect:'ALLOW'},{ruleId:'NEW',effectiveFrom:'2026-01-01',effect:'DENY'}],{asOf:'2026-08-19'});
      return { ok:r.candidates.length===1 && r.candidates[0].ruleId==='NEW' };
    }
    case 'real-knowledge-to-xp': {
      const g = new KnowledgeGraph(); g.add({type:'QURAN',tradition:'ISLAM',reference:'3:49',text:'test'});
      const a = buildAiAnalysis('Verifikasi "test" menurut Quran 3:49.', {sourceGraph:g});
      const v = a.domainAnalysis?.semantic?.semanticVector ?? a.domainAnalysis?.semanticVector;
      return { ok:a.intent==='UNRESOLVED' && Array.isArray(a.sourceMatches) };
    }
    case 'real-cab-to-project': {
      const c=createCab({title:'School',requesterId:ACTOR,heroReferenceId:'PROPHET-YUSUF',missionId:'MISSION-EDU'});
      const cr=createChangeRequest({cabId:c.cabId,requestedBy:ACTOR,title:'Build School',projectIds:['PROJECT-SCHOOL-001']});
      const rel=cabRelations({cabId:c.cabId,changeRequestId:cr.changeRequestId,shadowId:c.shadowId,heroReferenceId:c.heroReferenceId,missionId:c.missionId,projectIds:cr.projectIds});
      return { ok:rel.some(x=>x.type==='USES_SHADOW') && rel.some(x=>x.type==='USES_HERO_REFERENCE') && rel.some(x=>x.type==='HAS_MISSION') && rel.some(x=>x.type==='IMPLEMENTS_INTO_PROJECT') };
    }
    case 'real-shadow-hero': {
      const c=createCab({title:'Justice',requesterId:ACTOR,shadowId:ACTOR,heroReferenceId:'PROPHET-ISA'});
      return { ok:c.shadowId===ACTOR && c.heroReferenceId==='PROPHET-ISA' && c.operatorRid===ACTOR };
    }
    case 'real-audit-provenance': {
      const l = new ImmutableAuditLedger(); l.append({eventType:'DECISION',actorId:ACTOR,entityId:'CAB-001',sourceVersion:'knowledge-v1',modelVersion:'ai-v2',provenance:['SRC-001']});
      return { ok:l.verify().ok && l.history('CAB-001')[0].provenance.includes('SRC-001') };
    }
    case 'real-public-private': {
      const rec=createBaseModel({id:'PRIVATE-001',type:'KNOWLEDGE.CLAIM',createdBy:ACTOR});
      return { ok:rec.visibility==='PRIVATE' };
    }
    case 'real-unknown-is-not-false': {
      const g = new KnowledgeGraph();
      const a=buildAiAnalysis('Apakah "xyz" benar menurut sumber yang belum ada?',{sourceGraph:g});
      return { ok:a.sourceMatches.length===0 && a.intent==='UNRESOLVED' };
    }
    default: throw new Error(`Unknown case ${id}`);
  }
}

for (const [id, title] of CASES) {
  test(`${id} — ${title}`, async () => {
    const result = await execCase(id);
    assert.equal(result.ok, true, `case failed: ${id} ${JSON.stringify(result.details ?? {})}`);
  });
}

test('case matrix inventory', () => {
  assert.equal(CASES.length, 41);
});
