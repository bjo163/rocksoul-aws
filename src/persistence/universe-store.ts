import { PersistenceClient } from '../../packages/persistence/src/client.js';
import type { EntityRecord, EventRecord, RelationRecord, EvidenceRecord, PersistenceDriver } from '../../packages/persistence/src/types.js';
import { createCaseAggregate, type CaseAggregate } from '../case/case-aggregate.js';

export interface CaseStoreOptions {
  dataDir: string;
  driver?: PersistenceDriver;
  sqliteFile?: string;
  postgres?: Record<string, unknown>;
}

export class UniverseStore {
  readonly persistence: PersistenceClient;
  private readonly entities;
  private readonly relations;
  private readonly events;
  private readonly evidences;

  constructor(options: CaseStoreOptions) {
    this.persistence = new PersistenceClient({ driver: options.driver ?? 'file', fileDir: options.dataDir, sqliteFile: options.sqliteFile, postgres: options.postgres });
    this.entities = this.persistence.entities();
    this.relations = this.persistence.relations();
    this.events = this.persistence.events();
    this.evidences = this.persistence.store.evidenceRepository();
  }

  async upsertCase(input: Parameters<typeof createCaseAggregate>[0], actorId = 'SYSTEM-001'): Promise<CaseAggregate> {
    const aggregate = createCaseAggregate(input);
    if (!this.persistence.store.batch) throw new Error('TRANSACTION_NOT_SUPPORTED');
    await this.persistence.store.batch(async () => {
      await this.persistence.asActor(actorId).saveEntity({ ...toEntity(aggregate), expectedVersion: 0 });
      await this.persistEvidence(aggregate, actorId);
      await this.events.append({
        eventId: `EVT-CASE-${aggregate.id}-${aggregate.version}-${Date.now()}`,
        entityId: aggregate.id,
        eventType: aggregate.status === 'ANALYZED' ? 'CASE.ANALYZED' : 'CASE.OBSERVED',
        payload: aggregate as unknown as Record<string, unknown>,
        source: 'UNIVERSE_API', actorId, createdBy: actorId, updatedBy: actorId,
      });
    });
    return aggregate;
  }

  async saveCase(aggregate: CaseAggregate, eventType = 'CASE.UPDATED', actorId = 'SYSTEM-001'): Promise<CaseAggregate> {
    const existing = await this.entities.get(aggregate.id);
    if (existing) {
      const currentVersion = typeof existing.version === 'number' ? existing.version : 1;
      if (aggregate.version !== currentVersion + 1) {
        const error = new Error(`CASE_VERSION_CONFLICT:${aggregate.id}:${currentVersion}:${aggregate.version}`);
        Object.assign(error, { code: 'CASE_VERSION_CONFLICT', statusCode: 409, currentVersion });
        throw error;
      }
    } else if (aggregate.version !== 1) {
      const error = new Error(`CASE_VERSION_INVALID:${aggregate.id}`);
      Object.assign(error, { code: 'CASE_VERSION_CONFLICT', statusCode: 409, currentVersion: 0 });
      throw error;
    }
    if (!this.persistence.store.batch) throw new Error('TRANSACTION_NOT_SUPPORTED');
    await this.persistence.store.batch(async () => {
      await this.persistence.asActor(actorId).saveEntity({ ...toEntity(aggregate), expectedVersion: existing ? Number(existing.version ?? 1) : 0 });
      await this.persistEvidence(aggregate, actorId);
      await this.events.append({
        eventId: `EVT-CASE-${aggregate.id}-${aggregate.version}-${Date.now()}`,
        entityId: aggregate.id,
        eventType,
        payload: aggregate as unknown as Record<string, unknown>,
        source: 'UNIVERSE_API', actorId, createdBy: actorId, updatedBy: actorId,
      });
    });
    return aggregate;
  }

  async getCase(id: string): Promise<CaseAggregate | null> {
    const entity = await this.entities.get(id);
    if (!entity || entity.type !== 'CASE') return null;
    return entity.payload as unknown as CaseAggregate;
  }

  async listCaseEvents(id: string): Promise<EventRecord[]> {
    return this.events.listByEntity(id);
  }

  async listCaseEvidence(id: string): Promise<EvidenceRecord[]> {
    return this.evidences.listByEntity(id);
  }

  private async persistEvidence(aggregate: CaseAggregate, actorId = 'SYSTEM-001'): Promise<void> {
    const analysis = aggregate.analysis as Record<string, unknown> | undefined;
    const sources = Array.isArray(analysis?.sourceMatches) ? analysis.sourceMatches : Array.isArray(analysis?.provenance) ? analysis.provenance : [];
    for (let index = 0; index < sources.length; index += 1) {
      const item = sources[index];
      const payload: Record<string, unknown> = typeof item === 'object' && item !== null ? item as Record<string, unknown> : { value: item };
      await this.persistence.asActor(actorId).saveEvidence({ evidenceId: `EVD-${aggregate.id}-${index}`, entityId: aggregate.id, sourceType: typeof payload.type === 'string' ? payload.type : 'DERIVED', reference: typeof payload.reference === 'string' ? payload.reference : undefined, status: payload.status === 'OBSERVED' || payload.status === 'SUPPORTED' || payload.status === 'VERIFIED' || payload.status === 'CORROBORATED' || payload.status === 'INFERRED' || payload.status === 'CONFLICTED' ? payload.status : 'UNKNOWN', confidence: typeof payload.confidence === 'number' ? payload.confidence : undefined, payload });
    }
  }

  async relateCase(relation: RelationRecord, actorId = 'SYSTEM-001'): Promise<RelationRecord> {
    return this.persistence.asActor(actorId).saveRelation(relation);
  }

  async verifyLedger() {
    return this.events.verifyChain();
  }

  async auditHistory(recordId?: string) {
    return recordId ? this.persistence.auditStore().listByRecord(recordId) : this.persistence.auditStore().listAll();
  }

  async verifyAudit() {
    return this.persistence.auditStore().verify();
  }

  async close(): Promise<void> {
    await this.persistence.close();
  }
}

function toEntity(aggregate: CaseAggregate): EntityRecord {
  return {
    id: aggregate.id,
    type: 'CASE',
    version: aggregate.version,
    payload: aggregate as unknown as Record<string, unknown>,
    updatedAt: aggregate.updatedAt,
  };
}
