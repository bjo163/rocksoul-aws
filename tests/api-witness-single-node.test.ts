// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildApp } from '../apps/api/src/app.js';
import { createAuthService } from '../src/access/auth.js';
import { WitnessDag } from '../src/ledger/witness-dag.js';
import { appendMizanWitness } from '../src/ledger/witness-mizan.js';

async function json(base:string,route:string,init:RequestInit={}){const response=await fetch(`${base}${route}`,{...init,headers:{'content-type':'application/json',...(init.headers??{})}}); return {response,body:await response.json()};}

async function start(dataDir:string){const app=await buildApp({dataDir,persistenceDriver:'file'}); await app.start(0,'127.0.0.1'); const address=app.server.address(); assert.ok(address&&typeof address==='object'); return {app,base:`http://127.0.0.1:${address.port}`};}

test('HTTP boundary rejects malformed and oversized JSON with security headers', async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'mw-api-http-boundary-'));
  const instance=await start(dataDir);
  const previous=process.env.MW_MAX_BODY_BYTES; process.env.MW_MAX_BODY_BYTES='64';
  try {
    const malformed=await fetch(`${instance.base}/api/v1/observe`,{method:'POST',headers:{'content-type':'application/json'},body:'{"entityId":'});
    assert.equal(malformed.status,400); assert.equal((await malformed.json()).error,'MALFORMED_JSON');
    const oversized=await fetch(`${instance.base}/api/v1/observe`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({entityId:'TOO-LARGE',payload:{text:'x'.repeat(100)}})});
    assert.equal(oversized.status,413); assert.equal((await oversized.json()).error,'REQUEST_BODY_TOO_LARGE');
    assert.equal(oversized.headers.get('x-content-type-options'),'nosniff');
    assert.equal(oversized.headers.get('x-frame-options'),'DENY');
  } finally { if(previous===undefined) delete process.env.MW_MAX_BODY_BYTES; else process.env.MW_MAX_BODY_BYTES=previous; await instance.app.close(); await fs.rm(dataDir,{recursive:true,force:true}); }
});

test('single-node API persists Mizan witness across restart and completes backup diagnostics', async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'mw-api-witness-419-'));
  const auth=createAuthService({storagePath:path.join(dataDir,'auth-users.json')}); auth.createUser({username:'admin419',password:'strong-password-419',roles:['ADMIN']});
  let first=await start(dataDir);
  try {
    const login=await json(first.base,'/api/v1/auth/login',{method:'POST',body:JSON.stringify({username:'admin419',password:'strong-password-419'})}); assert.equal(login.response.status,200); const headers={authorization:`Bearer ${login.body.token}`};
    const analyzed=await json(first.base,'/api/v1/ai/analyze',{method:'POST',headers,body:JSON.stringify({text:'private integration text',semanticObservation:{action:'TEST',domainVector:{TEST:1},semantic:{R:0.1,G:0.2,B:0.3,L:0.4},actionGateVector:[0,0,0,0,0,0,0,0,0],impactVector:[0,0,0,0,0,0,0,0,0,0,0,0,0],timeFactor:{dimension:1,status:'OBSERVED',confidence:1},causality:{causal_strength:0.5,causal_confidence:0.8},evidence:[{type:'TEST',reference:'T:1'}]}})}); assert.equal(analyzed.response.status,200); assert.ok(analyzed.body.witness?.hash); assert.ok(analyzed.body.witness?.checkpointId);
    const status=await json(first.base,'/api/v1/witness/status',{headers}); assert.equal(status.response.status,200); assert.equal(status.body.version,'4.20.0'); assert.equal(status.body.nodes,1);
    const pre=await json(first.base,'/api/v1/witness/diagnostics',{headers}); assert.equal(pre.response.status,200); assert.equal(pre.body.state,'DEGRADED');
    const backup=await json(first.base,'/api/v1/witness/backups',{method:'POST',headers,body:'{}'}); assert.equal(backup.response.status,200); assert.ok(backup.body.backupId);
    const post=await json(first.base,'/api/v1/witness/diagnostics',{headers}); assert.equal(post.body.state,'HEALTHY');
    const metrics=await json(first.base,'/api/v1/witness/metrics',{headers}); assert.ok(metrics.body.counters.NODE_APPENDED>=1); assert.ok(metrics.body.counters.BACKUP_CREATED>=1);
  } finally { await first.app.close(); }

  const qdagRaw=await fs.readFile(path.join(dataDir,'witness','qdag.json'),'utf8'); assert.equal(qdagRaw.includes('private integration text'),false);
  const second=await start(dataDir);
  try {
    const login=await json(second.base,'/api/v1/auth/login',{method:'POST',body:JSON.stringify({username:'admin419',password:'strong-password-419'})}); const headers={authorization:`Bearer ${login.body.token}`};
    const status=await json(second.base,'/api/v1/witness/status',{headers}); assert.equal(status.body.nodes,1); assert.ok(status.body.root);
    const diagnostics=await json(second.base,'/api/v1/witness/diagnostics',{headers}); assert.equal(diagnostics.body.state,'HEALTHY');
  } finally { await second.app.close(); await fs.rm(dataDir,{recursive:true,force:true}); }
});

test('evaluation exposes the review gate and commits it to the Witness envelope', async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'mw-api-review-gate-'));
  const auth=createAuthService({storagePath:path.join(dataDir,'auth-users.json')}); auth.createUser({username:'admin-review',password:'strong-password-review',roles:['ADMIN']});
  const instance=await start(dataDir);
  try {
    const login=await json(instance.base,'/api/v1/auth/login',{method:'POST',body:JSON.stringify({username:'admin-review',password:'strong-password-review'})});
    assert.equal(login.response.status,200);
    const headers={authorization:`Bearer ${login.body.token}`};
    const evaluation=await json(instance.base,'/api/v1/evaluate',{method:'POST',headers,body:JSON.stringify({target:'EVAL-REVIEW-1',text:'uncertain review case',semanticObservation:{action:'TEST',domainVector:{TEST:1},semantic:{R:0,G:0,B:0,L:0},actionGateVector:[0,0,0,0,0,0,0,0,0],impactVector:[0,0,0,0,0,0,0,0,0,0,0,0,0],timeFactor:{dimension:1,status:'OBSERVED',confidence:0.4},causality:{causal_strength:0.1,causal_confidence:0.2},evidence:[]}})});
    assert.equal(evaluation.response.status,200);
    assert.ok(evaluation.body.reviewGate);
    assert.equal(evaluation.body.reviewGate.protocol,'HUMAN_REVIEW_GATE_V1');
    assert.ok(['REVIEW_REQUIRED','BLOCKED','RESOLVED'].includes(evaluation.body.status));
    assert.ok(evaluation.body.witness?.hash);
    assert.ok(evaluation.body.revelationScorecard);
  } finally { await instance.app.close(); await fs.rm(dataDir,{recursive:true,force:true}); }
});

test('changing a committed review gate invalidates the Witness hash', async()=>{
  const dag=new WitnessDag();
  const original=appendMizanWitness(dag,{recordId:'TAMPER-1',recordType:'EVALUATION',mizan:{direction:'NEUTRAL'},semantic:{},lifecycle:{},reviewGate:{protocol:'HUMAN_REVIEW_GATE_V1',requiresHumanReview:false,adverseActionBlocked:false,reasons:[]},modelVersion:'4.32.0'});
  assert.equal(dag.verify().valid,true);
  const tampered=structuredClone(original);
  (tampered.payload as any).reviewGate={protocol:'HUMAN_REVIEW_GATE_V1',requiresHumanReview:true,adverseActionBlocked:true,reasons:['TAMPERED']};
  const imported=new WitnessDag();
  assert.throws(()=>imported.import(tampered as any),/QDAG_HASH_MISMATCH/);
  assert.equal(original.payload.reviewGateHash.length,64);
});

test('persisted evidence is loaded into subsequent case analysis', async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'mw-api-evidence-loop-'));
  const auth=createAuthService({storagePath:path.join(dataDir,'auth-users.json')}); auth.createUser({username:'admin-evidence',password:'strong-password-evidence',roles:['ADMIN']});
  const instance=await start(dataDir);
  try {
    const login=await json(instance.base,'/api/v1/auth/login',{method:'POST',body:JSON.stringify({username:'admin-evidence',password:'strong-password-evidence'})});
    const headers={authorization:`Bearer ${login.body.token}`};
    const observed=await json(instance.base,'/api/v1/observe',{method:'POST',headers,body:JSON.stringify({entityId:'EVIDENCE-LOOP-1',payload:{text:'case with evidence'}})});
    assert.equal(observed.response.status,200);
    const attached=await json(instance.base,'/api/v1/resource/EVIDENCE-LOOP-1/evidence',{method:'POST',headers,body:JSON.stringify({evidenceId:'EVIDENCE-LOOP-1-A',sourceType:'DOCUMENT',reference:'DOC:1',status:'VERIFIED',confidence:0.9,payload:{note:'reviewed primary document'}})});
    assert.equal(attached.response.status,200);
    assert.equal(attached.body.evidence.status,'VERIFIED');
    const listed=await json(instance.base,'/api/v1/resource/EVIDENCE-LOOP-1/evidence',{headers});
    assert.equal(listed.response.status,200); assert.ok(listed.body.evidence.some((item:any)=>item.evidenceId==='EVIDENCE-LOOP-1-A'));
    const overwrite=await json(instance.base,'/api/v1/resource/EVIDENCE-LOOP-1/evidence',{method:'POST',headers,body:JSON.stringify({evidenceId:'EVIDENCE-LOOP-1-A',sourceType:'DOCUMENT',status:'CONFLICTED',payload:{note:'attempted overwrite'}})});
    assert.equal(overwrite.response.status,409); assert.equal(overwrite.body.error,'EVIDENCE_IMMUTABLE');
    const superseded=await json(instance.base,'/api/v1/resource/EVIDENCE-LOOP-1/evidence',{method:'POST',headers,body:JSON.stringify({evidenceId:'EVIDENCE-LOOP-1-B',sourceType:'DOCUMENT',status:'VERIFIED',supersedes:'EVIDENCE-LOOP-1-A',supersessionReason:'Corrected document reference',payload:{note:'replacement'}})});
    assert.equal(superseded.response.status,200);
    const history=await json(instance.base,'/api/v1/resource/EVIDENCE-LOOP-1/evidence',{headers});
    const original=history.body.evidence.find((item:any)=>item.evidenceId==='EVIDENCE-LOOP-1-A'); const replacement=history.body.evidence.find((item:any)=>item.evidenceId==='EVIDENCE-LOOP-1-B');
    assert.equal(original.supersededBy,'EVIDENCE-LOOP-1-B'); assert.equal(replacement.supersedes,'EVIDENCE-LOOP-1-A');
    const analyzed=await json(instance.base,'/api/v1/analyze',{method:'POST',headers,body:JSON.stringify({caseId:'EVIDENCE-LOOP-1',text:'case with evidence'})});
    assert.equal(analyzed.response.status,200);
    assert.ok(analyzed.body.semanticVector?.evidence?.some((item:any)=>item.id==='EVIDENCE-LOOP-1-A' && item.status==='VERIFIED'));
  } finally { await instance.app.close(); await fs.rm(dataDir,{recursive:true,force:true}); }
});

test('conflicting persisted evidence remains visible to subsequent analysis', async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'mw-api-evidence-conflict-'));
  const auth=createAuthService({storagePath:path.join(dataDir,'auth-users.json')}); auth.createUser({username:'admin-conflict',password:'strong-password-conflict',roles:['ADMIN']});
  const instance=await start(dataDir);
  try {
    const login=await json(instance.base,'/api/v1/auth/login',{method:'POST',body:JSON.stringify({username:'admin-conflict',password:'strong-password-conflict'})});
    const headers={authorization:`Bearer ${login.body.token}`};
    const observed=await json(instance.base,'/api/v1/observe',{method:'POST',headers,body:JSON.stringify({entityId:'EVIDENCE-CONFLICT-1',payload:{text:'conflicting case'}})});
    assert.equal(observed.response.status,200);
    const attached=await json(instance.base,'/api/v1/resource/EVIDENCE-CONFLICT-1/evidence',{method:'POST',headers,body:JSON.stringify({evidenceId:'EVIDENCE-CONFLICT-1-A',sourceType:'TESTIMONY',status:'CONFLICTED',confidence:0.8,payload:{note:'inconsistent account'}})});
    assert.equal(attached.response.status,200);
    const analyzed=await json(instance.base,'/api/v1/analyze',{method:'POST',headers,body:JSON.stringify({caseId:'EVIDENCE-CONFLICT-1',text:'conflicting case'})});
    assert.equal(analyzed.response.status,200);
    assert.ok(analyzed.body.semanticVector?.evidence?.some((item:any)=>item.id==='EVIDENCE-CONFLICT-1-A' && item.status==='CONFLICTED'));
  } finally { await instance.app.close(); await fs.rm(dataDir,{recursive:true,force:true}); }
});

test('review queue persists gate decision separately from reviewer disposition', async()=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'mw-api-review-workflow-'));
  const auth=createAuthService({storagePath:path.join(dataDir,'auth-users.json')}); auth.createUser({username:'admin-workflow',password:'strong-password-workflow',roles:['ADMIN']});
  const instance=await start(dataDir);
  try {
    const login=await json(instance.base,'/api/v1/auth/login',{method:'POST',body:JSON.stringify({username:'admin-workflow',password:'strong-password-workflow'})}); const headers={authorization:`Bearer ${login.body.token}`};
    const created=await json(instance.base,'/api/v1/reviews',{method:'POST',headers,body:JSON.stringify({targetId:'CASE-REVIEW-1',gateDecision:'BLOCK_ADVERSE_ACTION',evidenceRefs:['EVD-1']})});
    assert.equal(created.response.status,201); assert.equal(created.body.status,'QUEUED');
    const assigned=await json(instance.base,`/api/v1/reviews/${created.body.reviewId}/transition`,{method:'POST',headers,body:JSON.stringify({status:'ASSIGNED',assigneeId:'USR-REVIEWER'})}); assert.equal(assigned.body.status,'ASSIGNED');
    const acknowledged=await json(instance.base,`/api/v1/reviews/${created.body.reviewId}/transition`,{method:'POST',headers,body:JSON.stringify({status:'ACKNOWLEDGED'})}); assert.equal(acknowledged.body.status,'ACKNOWLEDGED');
    const disposed=await json(instance.base,`/api/v1/reviews/${created.body.reviewId}/transition`,{method:'POST',headers,body:JSON.stringify({status:'DISPOSED',disposition:'UPHOLD_GATE',rationale:'Evidence remains conflicted'})});
    assert.equal(disposed.body.disposition,'UPHOLD_GATE'); assert.equal(disposed.body.gateDecision,'BLOCK_ADVERSE_ACTION');
    const queue=await json(instance.base,'/api/v1/reviews',{headers}); assert.ok(queue.body.reviews.some((item:any)=>item.id===created.body.reviewId&&item.payload.disposition==='UPHOLD_GATE'));
  } finally {await instance.app.close();await fs.rm(dataDir,{recursive:true,force:true});}
});
