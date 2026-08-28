/**
 * Host-neutral orchestration for human review records.
 *
 * Review policy (the state machine and record factory) is injected so this
 * package stays independent from a particular persistence implementation or
 * API application. The workflow owns the durable write and event envelope.
 */

export type ReviewStatus = 'QUEUED' | 'ASSIGNED' | 'ACKNOWLEDGED' | 'EVIDENCE_REQUESTED' | 'DISPOSED' | 'ESCALATED' | 'REOPENED';
export type HumanDisposition = 'UPHOLD_GATE' | 'ALLOW_ANALYTICAL_DISPLAY' | 'REQUEST_MORE_EVIDENCE' | 'ESCALATE';

export type ReviewRecord = Record<string, unknown> & {
  reviewId: string;
  targetId: string;
  status: ReviewStatus;
  requestedBy: string;
  assigneeId?: string | null;
  gateDecision: string;
  evidenceRefs: string[];
  rationale?: string;
  disposition?: HumanDisposition | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export interface ReviewCreateInput {
  targetId: string;
  requestedBy: string;
  assigneeId?: string | null;
  gateDecision: string;
  evidenceRefs?: string[];
  reviewId?: string;
  now?: string;
}

export interface ReviewTransitionInput {
  status: ReviewStatus;
  actorId: string;
  rationale?: string;
  disposition?: HumanDisposition;
  assigneeId?: string;
  now?: string;
}

export interface ReviewWorkflowPorts {
  createReview(input: ReviewCreateInput): ReviewRecord;
  transitionReview(record: ReviewRecord, input: ReviewTransitionInput): ReviewRecord;
  saveEntity(input: {
    id: string;
    type: 'HUMAN_REVIEW';
    version: number;
    expectedVersion?: number;
    payload: ReviewRecord;
  }): Promise<unknown>;
  appendEvent(input: {
    eventId: string;
    entityId: string;
    eventType: 'HUMAN_REVIEW.CREATED' | 'HUMAN_REVIEW.TRANSITIONED';
    payload: ReviewRecord;
    actorId: string;
  }): Promise<unknown>;
}

export interface CreateReviewWorkflowInput extends ReviewCreateInput {
  actorId: string;
}

export async function runCreateReviewWorkflow(
  input: CreateReviewWorkflowInput,
  ports: Pick<ReviewWorkflowPorts, 'createReview' | 'saveEntity' | 'appendEvent'>,
): Promise<ReviewRecord> {
  const review = ports.createReview({
    reviewId: input.reviewId,
    targetId: input.targetId,
    requestedBy: input.requestedBy,
    assigneeId: input.assigneeId,
    gateDecision: input.gateDecision,
    evidenceRefs: input.evidenceRefs,
    now: input.now,
  });
  await ports.saveEntity({
    id: review.reviewId,
    type: 'HUMAN_REVIEW',
    version: review.version,
    payload: review,
  });
  await ports.appendEvent({
    eventId: `EVT-${review.reviewId}-CREATED`,
    entityId: review.targetId,
    eventType: 'HUMAN_REVIEW.CREATED',
    payload: review,
    actorId: input.actorId,
  });
  return review;
}

export interface TransitionReviewWorkflowInput {
  current: ReviewRecord;
  currentVersion: number;
  transition: ReviewTransitionInput;
}

export async function runTransitionReviewWorkflow(
  input: TransitionReviewWorkflowInput,
  ports: Pick<ReviewWorkflowPorts, 'transitionReview' | 'saveEntity' | 'appendEvent'>,
): Promise<ReviewRecord> {
  const next = ports.transitionReview(input.current, input.transition);
  await ports.saveEntity({
    id: next.reviewId,
    type: 'HUMAN_REVIEW',
    expectedVersion: input.currentVersion,
    version: next.version,
    payload: next,
  });
  await ports.appendEvent({
    eventId: `EVT-${next.reviewId}-${next.version}`,
    entityId: next.targetId,
    eventType: 'HUMAN_REVIEW.TRANSITIONED',
    payload: next,
    actorId: input.transition.actorId,
  });
  return next;
}
