import test from 'node:test';
import assert from 'node:assert/strict';
import { createReview, transitionReview } from '../src/review/workflow.js';

test('human review workflow preserves gate decision and enforces disposition transitions',()=>{
  const queued=createReview({reviewId:'REV-TEST-1',targetId:'CASE-1',requestedBy:'USR-1',gateDecision:'BLOCK_ADVERSE_ACTION',evidenceRefs:['EVD-1'],now:'2026-01-01T00:00:00.000Z'});
  assert.equal(queued.status,'QUEUED');
  const assigned=transitionReview(queued,{status:'ASSIGNED',actorId:'USR-2',assigneeId:'USR-2'});
  const acknowledged=transitionReview(assigned,{status:'ACKNOWLEDGED',actorId:'USR-2'});
  assert.throws(()=>transitionReview(acknowledged,{status:'DISPOSED',actorId:'USR-2'}),/REVIEW_DISPOSITION_REQUIRED/);
  const disposed=transitionReview(acknowledged,{status:'DISPOSED',actorId:'USR-2',disposition:'UPHOLD_GATE',rationale:'Evidence remains conflicted'});
  assert.equal(disposed.gateDecision,'BLOCK_ADVERSE_ACTION'); assert.equal(disposed.disposition,'UPHOLD_GATE'); assert.equal(disposed.version,4);
  assert.throws(()=>transitionReview(disposed,{status:'ACKNOWLEDGED',actorId:'USR-2'}),/REVIEW_INVALID_TRANSITION/);
});
