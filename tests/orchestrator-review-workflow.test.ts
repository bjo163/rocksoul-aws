import assert from 'node:assert/strict';
import test from 'node:test';
import { createReview, transitionReview } from '../src/review/workflow.js';
import { runCreateReviewWorkflow, runTransitionReviewWorkflow, type ReviewRecord } from '../packages/orchestrator/src/review-workflow.js';

test('review orchestrator persists a new review and emits its creation event', async () => {
  const calls: string[] = [];
  const saved: unknown[] = [];
  const events: unknown[] = [];
  const review = await runCreateReviewWorkflow({
    actorId: 'USR-1', targetId: 'CASE-1', requestedBy: 'USR-1',
    gateDecision: 'BLOCK_ADVERSE_ACTION', evidenceRefs: ['EVD-1'], now: '2026-01-01T00:00:00.000Z',
  }, {
    createReview,
    async saveEntity(input) { calls.push('save'); saved.push(input); },
    async appendEvent(input) { calls.push('event'); events.push(input); },
  });

  assert.deepEqual(calls, ['save', 'event']);
  assert.equal(review.status, 'QUEUED');
  assert.equal((saved[0] as { payload: ReviewRecord }).payload.reviewId, review.reviewId);
  assert.equal((events[0] as { eventType: string }).eventType, 'HUMAN_REVIEW.CREATED');
});

test('review orchestrator applies a transition with optimistic version and emits event', async () => {
  const queued = createReview({ reviewId: 'REV-1', targetId: 'CASE-1', requestedBy: 'USR-1', gateDecision: 'REQUIRE_HUMAN_REVIEW' });
  const assigned = transitionReview(queued, { status: 'ASSIGNED', actorId: 'USR-1', now: '2026-01-01T00:01:00.000Z' });
  const current = transitionReview(assigned, { status: 'ACKNOWLEDGED', actorId: 'USR-1', now: '2026-01-01T00:02:00.000Z' });
  let saved: Record<string, unknown> | undefined;
  let event: Record<string, unknown> | undefined;
  const next = await runTransitionReviewWorkflow({
    current,
    currentVersion: 3,
    transition: { status: 'DISPOSED', actorId: 'USR-1', disposition: 'UPHOLD_GATE', rationale: 'Evidence remains conflicted', now: '2026-01-02T00:00:00.000Z' },
  }, {
    transitionReview,
    async saveEntity(input) { saved = input; },
    async appendEvent(input) { event = input; },
  });

  assert.equal(next.status, 'DISPOSED');
  assert.equal(next.version, 4);
  assert.equal(saved?.expectedVersion, 3);
  assert.equal(saved?.version, 4);
  assert.equal(event?.eventId, 'EVT-REV-1-4');
  assert.equal(event?.eventType, 'HUMAN_REVIEW.TRANSITIONED');
});

test('review orchestrator does not persist when policy rejects a transition', async () => {
  const queued = createReview({ reviewId: 'REV-2', targetId: 'CASE-2', requestedBy: 'USR-1', gateDecision: 'REQUIRE_HUMAN_REVIEW' });
  const current = transitionReview(queued, { status: 'ACKNOWLEDGED', actorId: 'USR-1' });
  let writes = 0;
  await assert.rejects(() => runTransitionReviewWorkflow({
    current,
    currentVersion: 1,
    transition: { status: 'DISPOSED', actorId: 'USR-1' },
  }, {
    transitionReview,
    async saveEntity() { writes += 1; },
    async appendEvent() { writes += 1; },
  }), /REVIEW_DISPOSITION_REQUIRED/);
  assert.equal(writes, 0);
});
