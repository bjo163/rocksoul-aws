import crypto from 'node:crypto';
import type {
  EntityRecord,
  EvidenceRecord,
  PersistenceStore,
  ProjectionRecord,
  RelationRecord,
} from '@moonwitness/persistence';

export type AwsLegalRecordKind =
  | 'SOURCE'
  | 'INSTRUMENT'
  | 'TREATY_ACTION'
  | 'JURISDICTION'
  | 'APPLICABILITY'
  | 'CLAIM'
  | 'ASSESSMENT'
  | 'CASE';

export interface AwsLegalRecord<T extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  kind: AwsLegalRecordKind;
  payload: T;
  version?: number;
  updatedAt?: string;
}

export interface AwsSourceRevisionInput {
  sourceId: string;
  sourceUrl: string;
  fingerprint: string;
  capturedAt: string;
  payload: Record<string, unknown>;
  actorId?: string;
}

export interface AwsSourceRevision {
  revisionId: string;
  sourceId: string;
  sourceUrl: string;
  fingerprint: string;
  capturedAt: string;
  payload: Record<string, unknown>;
}

const ENTITY_PREFIX = 'AWS_';
const DEPENDENCY_RELATION = 'AWS_DEPENDS_ON';
const SOURCE_HEAD_PROJECTION = 'AWS_SOURCE_HEAD';

function assertAwsId(id: string): void {
  if (!id || typeof id !== 'string') throw new Error('AWS_RECORD_ID_REQUIRED');
}

function deterministicId(prefix: string, value: string): string {
  return `${prefix}-${crypto.createHash('sha256').update(value).digest('hex').slice(0, 32).toUpperCase()}`;
}

function toRecord(entity: EntityRecord): AwsLegalRecord {
  const kind = entity.type.startsWith(ENTITY_PREFIX)
    ? entity.type.slice(ENTITY_PREFIX.length) as AwsLegalRecordKind
    : entity.type as AwsLegalRecordKind;
  return {
    id: entity.id,
    kind,
    payload: structuredClone(entity.payload),
    version: entity.version,
    updatedAt: entity.updatedAt,
  };
}

/**
 * AWS domain facade over the shared PersistenceStore.
 *
 * PostgreSQL/file/memory ownership stays in @moonwitness/persistence. This
 * facade only defines legal-domain record types, provenance, and dependency
 * semantics; it never issues SQL directly.
 */
export class AwsLegalStore {
  constructor(private readonly persistence: PersistenceStore) {}

  async upsertRecord<T extends Record<string, unknown>>(
    kind: AwsLegalRecordKind,
    id: string,
    payload: T,
    actorId = 'SYSTEM-AWS',
  ): Promise<AwsLegalRecord<T>> {
    assertAwsId(id);
    const existing = await this.persistence.entityRepository().get(id);
    const saved = await this.persistence.entityRepository().put({
      id,
      type: `${ENTITY_PREFIX}${kind}`,
      expectedVersion: existing?.version ?? 0,
      version: (existing?.version ?? 0) + 1,
      payload: structuredClone(payload),
      createdBy: existing?.createdBy ?? actorId,
      updatedBy: actorId,
    });
    return toRecord(saved) as AwsLegalRecord<T>;
  }

  async getRecord<T extends Record<string, unknown> = Record<string, unknown>>(id: string): Promise<AwsLegalRecord<T> | null> {
    const entity = await this.persistence.entityRepository().get(id);
    if (!entity || !entity.type.startsWith(ENTITY_PREFIX)) return null;
    return toRecord(entity) as AwsLegalRecord<T>;
  }

  async listRecords<T extends Record<string, unknown> = Record<string, unknown>>(kind: AwsLegalRecordKind): Promise<AwsLegalRecord<T>[]> {
    const entities = await this.persistence.entityRepository().list(`${ENTITY_PREFIX}${kind}`);
    return entities.map((entity) => toRecord(entity) as AwsLegalRecord<T>);
  }

  /**
   * Records that dependentId needs dependencyId in order to be interpreted.
   * The edge direction is DEPENDENT -> DEPENDENCY so reverse traversal finds
   * impacted cases when an upstream source changes.
   */
  async linkDependency(dependentId: string, dependencyId: string, actorId = 'SYSTEM-AWS'): Promise<RelationRecord> {
    assertAwsId(dependentId);
    assertAwsId(dependencyId);
    const id = deterministicId('REL-AWS', `${dependentId}:${DEPENDENCY_RELATION}:${dependencyId}`);
    return this.persistence.relationRepository().put({
      id,
      fromId: dependentId,
      type: DEPENDENCY_RELATION,
      toId: dependencyId,
      payload: { domain: 'AWS', semantics: 'DEPENDENT_REQUIRES_DEPENDENCY' },
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  /**
   * Traverses reverse AWS_DEPENDS_ON edges and returns only AWS CASE entities.
   */
  async findDependentCases(upstreamId: string): Promise<string[]> {
    const visited = new Set<string>([upstreamId]);
    const queue = [upstreamId];
    const cases = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const relations = await this.persistence.relationRepository().listByEntity(current);
      for (const relation of relations) {
        if (relation.type !== DEPENDENCY_RELATION || relation.toId !== current) continue;
        const dependentId = relation.fromId;
        if (visited.has(dependentId)) continue;
        visited.add(dependentId);
        const entity = await this.persistence.entityRepository().get(dependentId);
        if (!entity || !entity.type.startsWith(ENTITY_PREFIX)) continue;
        if (entity.type === `${ENTITY_PREFIX}CASE`) cases.add(dependentId);
        queue.push(dependentId);
      }
    }

    return [...cases].sort();
  }

  async latestSourceRevision(sourceId: string): Promise<AwsSourceRevision | null> {
    const projection = await this.persistence.projectionStore().get(sourceId, SOURCE_HEAD_PROJECTION);
    if (!projection) return null;
    const payload = projection.payload;
    if (
      typeof payload.revisionId !== 'string' ||
      typeof payload.sourceUrl !== 'string' ||
      typeof payload.fingerprint !== 'string' ||
      typeof payload.capturedAt !== 'string' ||
      !payload.payload ||
      typeof payload.payload !== 'object' ||
      Array.isArray(payload.payload)
    ) {
      throw new Error(`AWS_SOURCE_HEAD_CORRUPT:${sourceId}`);
    }
    return {
      revisionId: payload.revisionId,
      sourceId,
      sourceUrl: payload.sourceUrl,
      fingerprint: payload.fingerprint,
      capturedAt: payload.capturedAt,
      payload: structuredClone(payload.payload as Record<string, unknown>),
    };
  }

  async persistSourceRevision(input: AwsSourceRevisionInput): Promise<AwsSourceRevision> {
    assertAwsId(input.sourceId);
    if (!/^[a-f0-9]{64}$/i.test(input.fingerprint)) throw new Error('AWS_SOURCE_FINGERPRINT_INVALID');
    const actorId = input.actorId ?? 'SYSTEM-AWS-WORKER';
    const revisionId = deterministicId('REV-AWS', `${input.sourceId}:${input.fingerprint}`);
    const revision: AwsSourceRevision = {
      revisionId,
      sourceId: input.sourceId,
      sourceUrl: input.sourceUrl,
      fingerprint: input.fingerprint.toLowerCase(),
      capturedAt: input.capturedAt,
      payload: structuredClone(input.payload),
    };

    await this.persistence.batch(async () => {
      const evidence: EvidenceRecord = {
        evidenceId: revisionId,
        entityId: input.sourceId,
        sourceType: 'AWS_SOURCE_REVISION',
        reference: input.sourceUrl,
        status: 'VERIFIED',
        confidence: 1,
        payload: {
          revisionId,
          fingerprint: revision.fingerprint,
          capturedAt: input.capturedAt,
          payload: structuredClone(input.payload),
        },
        createdBy: actorId,
        updatedBy: actorId,
      };
      await this.persistence.evidenceRepository().put(evidence);

      await this.persistence.eventStore().append({
        eventId: deterministicId('EVT-AWS', revisionId),
        entityId: input.sourceId,
        eventType: 'AWS.SOURCE.REVISION',
        payload: {
          revisionId,
          sourceUrl: input.sourceUrl,
          fingerprint: revision.fingerprint,
          capturedAt: input.capturedAt,
        },
        actorId,
        source: input.sourceUrl,
        occurredAt: input.capturedAt,
      });

      const head: ProjectionRecord = {
        projectionId: deterministicId('PROJ-AWS', `${input.sourceId}:${SOURCE_HEAD_PROJECTION}`),
        entityId: input.sourceId,
        projectionType: SOURCE_HEAD_PROJECTION,
        payload: structuredClone(revision) as unknown as Record<string, unknown>,
        updatedBy: actorId,
      };
      await this.persistence.projectionStore().upsert(head);
    });

    return revision;
  }

  async verifyAuditIntegrity(): Promise<{ valid: boolean; count: number; head: string | null }> {
    return this.persistence.auditStore().verify();
  }

  async verifyEventIntegrity() {
    return this.persistence.eventStore().verifyChain();
  }
}

export const AWS_DEPENDENCY_RELATION = DEPENDENCY_RELATION;
export const AWS_SOURCE_HEAD_PROJECTION = SOURCE_HEAD_PROJECTION;
