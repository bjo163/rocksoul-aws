import { randomUUID } from 'node:crypto';

export type ReviewStatus = 'QUEUED' | 'ASSIGNED' | 'ACKNOWLEDGED' | 'EVIDENCE_REQUESTED' | 'DISPOSED' | 'ESCALATED' | 'REOPENED';
export type HumanDisposition = 'UPHOLD_GATE' | 'ALLOW_ANALYTICAL_DISPLAY' | 'REQUEST_MORE_EVIDENCE' | 'ESCALATE';

export interface ReviewRecord extends Record<string, unknown> {
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
}

export function createReview(input: {
  reviewId?: string;
  targetId: string;
  requestedBy: string;
  assigneeId?: string | null;
  gateDecision: string;
  evidenceRefs?: string[];
  now?: string;
}): ReviewRecord {
  const now = input.now ?? new Date().toISOString();
  return {
    reviewId: input.reviewId ?? `REV-${randomUUID()}`,
    targetId: input.targetId,
    status: input.assigneeId ? 'ASSIGNED' : 'QUEUED',
    requestedBy: input.requestedBy,
    assigneeId: input.assigneeId ?? null,
    gateDecision: input.gateDecision,
    evidenceRefs: [...(input.evidenceRefs ?? [])],
    disposition: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export function transitionReview(record: ReviewRecord, input: {
  status: ReviewStatus;
  actorId: string;
  rationale?: string;
  disposition?: HumanDisposition;
  assigneeId?: string;
  now?: string;
}): ReviewRecord {
  if (!input.actorId) throw new Error('REVIEW_ACTOR_REQUIRED');
  const allowed: Record<ReviewStatus, ReviewStatus[]> = {
    QUEUED: ['ASSIGNED', 'ACKNOWLEDGED', 'ESCALATED'],
    ASSIGNED: ['ACKNOWLEDGED', 'EVIDENCE_REQUESTED', 'ESCALATED'],
    ACKNOWLEDGED: ['EVIDENCE_REQUESTED', 'DISPOSED', 'ESCALATED'],
    EVIDENCE_REQUESTED: ['ACKNOWLEDGED', 'DISPOSED', 'ESCALATED'],
    DISPOSED: ['REOPENED'],
    ESCALATED: ['ACKNOWLEDGED', 'DISPOSED', 'REOPENED'],
    REOPENED: ['ASSIGNED', 'ACKNOWLEDGED', 'EVIDENCE_REQUESTED', 'ESCALATED'],
  };
  if (!allowed[record.status].includes(input.status)) throw new Error(`REVIEW_INVALID_TRANSITION:${record.status}:${input.status}`);
  if (input.status === 'DISPOSED' && !input.disposition) throw new Error('REVIEW_DISPOSITION_REQUIRED');
  return {
    ...record,
    status: input.status,
    assigneeId: input.assigneeId ?? record.assigneeId,
    rationale: input.rationale ?? record.rationale,
    disposition: input.disposition ?? record.disposition,
    updatedAt: input.now ?? new Date().toISOString(),
    version: record.version + 1,
  };
}
