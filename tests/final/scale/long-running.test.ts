// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { ImmutableAuditLedger } from '../../../src/audit/immutable-ledger.js';
import { buildAiAnalysis } from '../../../src/ai/general-analyzer.js';

test('audit ledger handles 10000 append-only events and remains valid', () => {
  const ledger=new ImmutableAuditLedger();
  for(let i=1;i<=10000;i++) ledger.append({eventType:'STRESS.EVENT',entityId:`E-${i%100}`,actorId:'SYSTEM-001',payload:{i}});
  const v=ledger.verify();
  assert.equal(v.ok,true);
  assert.equal(v.count,10000);
});

test('AI remains deterministic across repeated analysis', () => {
  const input='Periksa apakah quote "X" benar menurut Quran 3:49 di Indonesia';
  const a=buildAiAnalysis(input);
  const b=buildAiAnalysis(input);
  assert.deepEqual({...a,provenance:undefined}, {...b,provenance:undefined});
});
