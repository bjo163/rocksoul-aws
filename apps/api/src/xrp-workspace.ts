import { isHumanReviewGate, type HumanReviewGate, type XrpCaseSummary, type XrpWorkspaceResponse } from '../../../packages/contracts/src/index.js';
import type { EntityRecord, EventRecord, EvidenceRecord } from '../../../packages/persistence/src/types.js';
import type { WitnessDag } from '../../../src/ledger/witness-dag.js';
import type { PersistenceClient } from '../../../packages/persistence/src/client.js';

interface WorkspaceUser { userId: string; rid: string }

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function owns(entity: EntityRecord, user: WorkspaceUser): boolean {
  const payload = object(entity.payload);
  return payload.ownerRid === user.rid || entity.createdBy === user.userId;
}

function titleFor(entity: EntityRecord): string {
  const payload = object(entity.payload);
  const observation = object(payload.observation);
  const observationPayload = object(observation.payload);
  const candidate = text(payload.title, text(payload.name, text(observation.title, text(observationPayload.title, text(observation.text, entity.id)))));
  return candidate.length > 96 ? `${candidate.slice(0, 93)}…` : candidate;
}

function currentReviewGate(entity: EntityRecord, events: EventRecord[]): HumanReviewGate | null {
  const analysis = object(object(entity.payload).analysis);
  if (isHumanReviewGate(analysis.reviewGate)) return analysis.reviewGate;
  for (const event of [...events].reverse()) {
    const gate = object(event.payload).reviewGate;
    if (isHumanReviewGate(gate)) return gate;
  }
  return null;
}

function sanitizeEvidence(items: EvidenceRecord[]) {
  const superseded = new Set(items.map((item) => object(item.payload).supersedes).filter((value): value is string => typeof value === 'string'));
  return items.map((item) => ({
    id: item.evidenceId,
    status: item.status ?? 'UNKNOWN',
    sourceType: item.sourceType,
    ...(item.reference ? { reference: item.reference } : {}),
    ...(typeof item.confidence === 'number' ? { confidence: item.confidence } : {}),
    ...(superseded.has(item.evidenceId) ? { superseded: true } : {}),
  }));
}

function recordBelongsToCase(recordId: string, caseId: string, eventIds: Set<string>): boolean {
  return recordId === caseId || recordId.startsWith(`${caseId}:`) || eventIds.has(recordId);
}

export async function buildXrpWorkspace(persistence: PersistenceClient, dag: WitnessDag, user: WorkspaceUser): Promise<XrpWorkspaceResponse> {
  const entities = await persistence.entities().list();
  const owned = entities.filter((entity) => owns(entity, user));
  const caseEntities = owned.filter((entity) => entity.type === 'CASE');
  const reviewEntities = entities.filter((entity) => entity.type === 'HUMAN_REVIEW');
  const dagNodes = dag.list();

  const cases: XrpCaseSummary[] = await Promise.all(caseEntities.map(async (entity) => {
    const [evidence, events] = await Promise.all([
      persistence.evidenceRepository().listByEntity(entity.id),
      persistence.events().listByEntity(entity.id),
    ]);
    const eventIds = new Set(events.map((event) => event.eventId));
    const reviews = reviewEntities
      .map((item) => object(item.payload))
      .filter((item) => item.targetId === entity.id)
      .map((item) => ({
        reviewId: text(item.reviewId, 'UNKNOWN'),
        status: text(item.status, 'QUEUED') as XrpCaseSummary['reviews'][number]['status'],
        gateDecision: text(item.gateDecision, 'REQUIRE_HUMAN_REVIEW'),
        updatedAt: text(item.updatedAt, entity.updatedAt ?? new Date(0).toISOString()),
      }));
    const witnessNodes = dagNodes.filter((node) => {
      const recordId = object(node.payload).recordId;
      return typeof recordId === 'string' && recordBelongsToCase(recordId, entity.id, eventIds);
    });
    const latestWitness = witnessNodes.at(-1) ?? null;
    return {
      id: entity.id,
      title: titleFor(entity),
      status: text(object(entity.payload).status, 'OBSERVED'),
      updatedAt: entity.updatedAt ?? text(object(entity.payload).updatedAt, new Date(0).toISOString()),
      evidence: sanitizeEvidence(evidence),
      reviews,
      reviewGate: currentReviewGate(entity, events),
      witness: {
        state: latestWitness ? 'VALID' : 'PENDING',
        hash: latestWitness?.hash ?? null,
        root: null,
        nodeCount: witnessNodes.length,
        checkpointId: null,
      },
    };
  }));

  cases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const workItems = owned
    .filter((entity) => ['PROJECT', 'TASK', 'RESOURCE'].includes(entity.type))
    .map((entity) => {
      const payload = object(entity.payload);
      return {
        id: entity.id,
        type: entity.type as 'PROJECT' | 'TASK' | 'RESOURCE',
        title: titleFor(entity),
        status: text(payload.status, 'OPEN'),
        ...(typeof payload.dueAt === 'string' ? { dueAt: payload.dueAt } : {}),
        updatedAt: entity.updatedAt ?? text(payload.updatedAt, new Date(0).toISOString()),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const today = Date.now();
  const dueLimit = today + 7 * 24 * 60 * 60 * 1000;
  return {
    protocol: 'MW_XRP_WORKSPACE_V1',
    rid: user.rid,
    generatedAt: new Date().toISOString(),
    summary: {
      activeCases: cases.filter((item) => !['COMPLETED', 'RESOLVED'].includes(item.status)).length,
      awaitingReview: cases.reduce((count, item) => count + item.reviews.filter((review) => !['DISPOSED'].includes(review.status)).length, 0),
      verifiedEvidence: cases.reduce((count, item) => count + item.evidence.filter((evidence) => ['VERIFIED', 'CORROBORATED'].includes(evidence.status) && !evidence.superseded).length, 0),
      dueTasks: workItems.filter((item) => item.type === 'TASK' && item.dueAt && Date.parse(item.dueAt) >= today && Date.parse(item.dueAt) <= dueLimit && !['DONE', 'COMPLETED', 'CLOSED'].includes(item.status)).length,
    },
    cases,
    workItems,
  };
}
