// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import {makeChangeSet,SyncQueue,resolveSyncConflict,reconcile} from '../../../src/sync/local-first.js';
import {temporalRecord,asOf} from '../../../src/sync/temporal.js';

test('v2.16 local-first and temporal',()=>{
  const q=new SyncQueue(); const cs=makeChangeSet({nodeId:'NODE-1',events:[{eventId:'E1'}]}); q.enqueue(cs); assert.equal(q.pending().length,1); q.ack(cs.changeSetId); assert.equal(q.pending().length,0);
  assert.equal(resolveSyncConflict({local:{version:1},remote:{version:2}}).status,'CONFLICT');
  assert.equal(reconcile({changesets:[cs,cs]}).conflicts.length,1);
  const r1=temporalRecord({data:{v:1},validFrom:'2026-01-01T00:00:00Z',validTo:'2026-06-01T00:00:00Z',version:1});
  const r2=temporalRecord({data:{v:2},validFrom:'2026-06-01T00:00:00Z',version:2});
  assert.equal(asOf([r1,r2],'2026-07-01T00:00:00Z').data.v,2);
});
