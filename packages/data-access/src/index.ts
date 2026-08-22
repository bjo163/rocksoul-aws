import type { EntityRecord, RelationRecord, EventRecord, EvidenceRecord, ProjectionRecord, AuditRecord } from '@moonwitness/persistence';
import { PersistenceClient } from '@moonwitness/persistence';

export class UniverseDataClient {
  constructor(public readonly persistence = new PersistenceClient({ driver: 'file' }), public readonly actorId = 'SYSTEM-001') {}
  asActor(actorId: string): UniverseDataClient { return new UniverseDataClient(this.persistence, actorId); }
  entities() { return this.persistence.entities(); }
  relations() { return this.persistence.relations(); }
  events() { return this.persistence.events(); }
  evidence() { return this.persistence.store.evidenceRepository(); }
  audit() { return this.persistence.auditStore(); }
  upsertEntity(e: EntityRecord) { return this.persistence.asActor(this.actorId).saveEntity(e); }
  addRelation(r: RelationRecord) { return this.persistence.asActor(this.actorId).saveRelation(r); }
  appendEvent(e: EventRecord) { return this.persistence.asActor(this.actorId).appendEvent(e); }
  saveEvidence(e: EvidenceRecord) { return this.persistence.asActor(this.actorId).saveEvidence(e); }
  saveProjection(p: ProjectionRecord) { return this.persistence.asActor(this.actorId).saveProjection(p); }
  auditHistory(recordId?: string): Promise<AuditRecord[]> { return recordId ? this.audit().listByRecord(recordId) : this.audit().listAll(); }
  verifyAudit() { return this.audit().verify(); }
  verifyLedger() { return this.events().verifyChain(); }
  close() { return this.persistence.close(); }
}
