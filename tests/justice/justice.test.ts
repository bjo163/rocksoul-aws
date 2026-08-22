// @ts-nocheck
import assert from 'node:assert/strict';
import { analyzeLaw } from '../../src/justice/legal-analyzer.js';
import { createCase, policeReview, prosecutorReview, defenseReview, courtVerdict, sentence, appeal } from '../../src/justice/justice-workflow.js';
const r=analyzeLaw({text:'merokok saat puasa di tempat umum',semanticObservation:{action:'SMOKING'},jurisdiction:'ID'});
assert.equal(r.action,'SMOKING');
assert.equal(r.semantic.legacyActionProfile.normativeAuthority,false);
assert.equal(r.semantic.asmaAuthority,'PURE_REVELATION_ASMA_ENGINE_ONLY');
assert.ok(r.legal.status==='CONTEXT_DEPENDENT');
const c=createCase({jurisdiction:'ID',allegation:'corruption'}); policeReview(c); prosecutorReview(c,{charge:'CORRUPTION'}); defenseReview(c); courtVerdict(c,{verdict:'GUILTY'}); sentence(c,{type:'LAW_DEPENDENT_REMEDY',restitution:100}); appeal(c);
assert.equal(c.status,'APPEAL_PENDING');
console.log('PASS: justice stack detached from legacy 99-Asma registry');
