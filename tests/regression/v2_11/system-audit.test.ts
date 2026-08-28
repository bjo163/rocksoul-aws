// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { auditSystem } from '../../../src/audit/system-audit.js';
import { buildAnalyticalSemanticVector } from '../../../src/semantic/analytical-vector.js';
import { evaluateMizan } from '@moonwitness/mizan-engine';

test('full system audit reports revelation-first score path',()=>{ const a=auditSystem(); assert.equal(a.status,'PASS'); assert.equal(a.scoreIntegration.hardcodedActionAsmaVector,false); assert.equal(a.scoreIntegration.rgblToMizan,true); });
test('analytical vector carries generic attributes without Asma authority',()=>{ const v=buildAnalyticalSemanticVector({primary:['SIG-A'],secondary:['SIG-B','SIG-C'],mode:'DEVIATION'}); assert.equal(v.semanticReady,true); assert.equal(v.normativeAuthority,false); assert.ok(v.attributes.length>=3); assert.ok(v.weights['SIG-A']>v.weights['SIG-B']); });
test('Mizan consumes generic semantic vector and deviation mode',()=>{ const v=buildAnalyticalSemanticVector({primary:['SIG-A'],secondary:['SIG-B','SIG-C'],mode:'DEVIATION'}); const r=evaluateMizan({semantic:{R:-.5,G:-.7,B:-1,L:-.4},semanticVector:v,scale:{scope:'NATION',reach:'R8',depth:'D6',duration:'LONG',reversibility:'HARD_TO_REVERSE',power:'NATIONAL_OFFICIAL',exposure:'NATIONAL',systemicity:'NATIONAL_SYSTEM',environment:'NATIONAL_ENVIRONMENT',futureImpact:'HIGH',evidence:'HIGH',dignity:'HIGH',socialImpact:'HIGH',risk:'HIGH'},factors:{mode:'DEVIATION',quality:1,intent:0.9}}); assert.ok(r.xp.deviationScore>0); assert.ok(r.xp.essenceFactor>0); assert.ok(r.scaleFactor>0.5); });
