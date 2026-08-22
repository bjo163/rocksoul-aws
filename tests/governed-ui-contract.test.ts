import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const governed=fs.readFileSync('packages/ui/src/governed.tsx','utf8');

test('shared UI owns the five governed operational views',()=>{
  for(const component of ['EvidenceLedger','ReviewGatePanel','WitnessPanel','AuditTimeline','WorldStateSnapshot']) assert.match(governed,new RegExp(`function ${component}`));
  for(const boundary of ['HASH COMMITMENT · NOT VERDICT','does not prove factual truth or Divine acceptance','HUMAN AUTHORITY · LIMITED','NOT_EVALUATED']) assert.ok(governed.includes(boundary),boundary);
});

test('semantic state mapping is explicit and fails neutral for unknown values',()=>{
  assert.match(governed,/\['VERIFIED','CORROBORATED','SUPPORTED','VALID','RESOLVED','ALLOW'\]/);
  assert.match(governed,/\['CONFLICTED','BLOCKED','INVALID','REJECT','CRITICAL'\]/);
  assert.match(governed,/return 'neutral'/);
  assert.doesNotMatch(governed,/spiritual rank|divine score|final judgement granted/i);
});

test('CAB composes evidence, review, Witness, audit and world state from shared UI',()=>{
  const workflow=fs.readFileSync('apps/cab/src/components/CaseWorkflow.tsx','utf8');
  const reviews=fs.readFileSync('apps/cab/src/components/ReviewQueue.tsx','utf8');
  const observatory=fs.readFileSync('apps/cab/src/components/Observatory.tsx','utf8');
  for(const name of ['EvidenceLedger','ReviewGatePanel','WitnessPanel','AuditTimeline']) assert.ok(workflow.includes(name),name);
  assert.match(reviews,/ReviewGatePanel/); assert.match(observatory,/WorldStateSnapshot/); assert.match(observatory,/AuditTimeline/);
});

test('XRP empty state does not fabricate case metrics or positive evidence',()=>{
  const xrp=fs.readFileSync('apps/xrp/src/App.tsx','utf8');
  for(const name of ['EvidenceLedger','ReviewGatePanel','WitnessPanel','NO CASE SELECTED']) assert.ok(xrp.includes(name),name);
  assert.doesNotMatch(xrp,/value="(?:3|4|18)"|18 references|2 updated today/);
});

test('Flow exposes human gate and pending Witness as governed panels',()=>{
  const flow=fs.readFileSync('apps/flow/src/App.tsx','utf8');
  assert.match(flow,/ReviewGatePanel/); assert.match(flow,/decision:'REVIEW_REQUIRED'/); assert.match(flow,/adverseActionBlocked:true/);
  assert.match(flow,/WitnessPanel/); assert.match(flow,/state:'PENDING'/);
});
