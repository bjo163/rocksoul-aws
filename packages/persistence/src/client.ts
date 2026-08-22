import type { PersistenceConfig, PersistenceStore, EntityRecord, RelationRecord, EventRecord, ProjectionRecord, EvidenceRecord, AuditStore } from './types.js';
import { createPersistence } from './factory.js';


export interface ActorScopedPersistence {
  saveEntity(entity: EntityRecord): Promise<EntityRecord>;
  saveRelation(relation: RelationRecord): Promise<RelationRecord>;
  appendEvent(event: EventRecord): Promise<EventRecord>;
  saveEvidence(evidence: EvidenceRecord): Promise<EvidenceRecord>;
  saveProjection(projection: ProjectionRecord): Promise<ProjectionRecord>;
}

export class PersistenceClient {
  readonly store: PersistenceStore;
  constructor(config: PersistenceConfig = {}) { this.store = createPersistence(config); }
  entities() { return this.store.entityRepository(); }
  relations() { return this.store.relationRepository(); }
  events() { return this.store.eventStore(); }
  projections() { return this.store.projectionStore(); }
  evidenceRepository() { return this.store.evidenceRepository(); }
  async saveEntity(entity: EntityRecord) { return this.entities().put(entity); }
  async saveRelation(relation: RelationRecord) { return this.relations().put(relation); }
  async appendEvent(event: EventRecord) { return this.events().append(event); }
  async saveProjection(projection: ProjectionRecord) { return this.projections().upsert(projection); }
  async batch<T>(work: () => Promise<T> | T): Promise<T> { if (!this.store.batch) throw new Error('TRANSACTION_NOT_SUPPORTED'); return this.store.batch(work); }
  async ready(): Promise<void> { if (this.store.ready) await this.store.ready(); }
  auditStore(): AuditStore { return this.store.auditStore(); }
  asActor(actorId: string, correlationId?: string): ActorScopedPersistence {
    const now = () => new Date().toISOString();
    return {
      saveEntity: (entity) => this.store.entityRepository().put({ ...entity, createdBy: entity.createdBy ?? actorId, updatedBy: actorId, createdAt: entity.createdAt ?? now(), updatedAt: now() }),
      saveRelation: (relation) => this.store.relationRepository().put({ ...relation, createdBy: relation.createdBy ?? actorId, updatedBy: actorId, createdAt: relation.createdAt ?? now(), updatedAt: now() }),
      appendEvent: (event) => this.store.eventStore().append({ ...event, createdBy: event.createdBy ?? actorId, updatedBy: actorId, createdAt: event.createdAt ?? now(), updatedAt: now(), actorId: event.actorId ?? actorId, source: event.source ?? correlationId ?? null }),
      saveEvidence: (evidence) => this.store.evidenceRepository().put({ ...evidence, createdBy: evidence.createdBy ?? actorId, updatedBy: actorId, createdAt: evidence.createdAt ?? now(), updatedAt: now() }),
      saveProjection: (projection) => this.store.projectionStore().upsert({ ...projection, createdBy: projection.createdBy ?? actorId, updatedBy: actorId, createdAt: projection.createdAt ?? now(), updatedAt: now() }),
    };
  }
  close() { return this.store.close(); }
}
