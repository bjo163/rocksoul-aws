import { hashEvent } from './hash.js';
import { makeAuditRecord, changedFields, hashAudit } from './audit.js';
import type { AuditRecord } from './types.js';
import type { PersistenceStore, EntityRecord, RelationRecord, EventRecord, ProjectionRecord, EvidenceRecord, SystemTraceRecord, SystemJobRecord } from './types.js';

export class MemoryProvider implements PersistenceStore {
  readonly driver = 'memory' as const;
  async batch<T>(work: () => Promise<T> | T): Promise<T> {
    const snapshot = {
      entities: new Map(this.entities),
      relations: new Map(this.relations),
      events: [...this.events],
      projections: new Map(this.projections),
      evidences: new Map(this.evidences),
      audits: [...this.audits],
      traces: [...this.traces],
    };
    try {
      return await work();
    } catch (error) {
      this.entities.clear(); for (const [k,v] of snapshot.entities) this.entities.set(k,v);
      this.relations.clear(); for (const [k,v] of snapshot.relations) this.relations.set(k,v);
      this.events.splice(0, this.events.length, ...snapshot.events);
      this.projections.clear(); for (const [k,v] of snapshot.projections) this.projections.set(k,v);
      this.evidences.clear(); for (const [k,v] of snapshot.evidences) this.evidences.set(k,v);
      this.audits.splice(0, this.audits.length, ...snapshot.audits);
      this.traces.splice(0, this.traces.length, ...snapshot.traces);
      throw error;
    }
  }
  private readonly entities = new Map<string, EntityRecord>();
  private readonly relations = new Map<string, RelationRecord>();
  private readonly events: EventRecord[] = [];
  private readonly projections = new Map<string, ProjectionRecord>();
  private readonly evidences = new Map<string, EvidenceRecord>();
  private readonly audits: (AuditRecord & {hash:string})[] = [];
  private readonly traces: SystemTraceRecord[] = [];
  private readonly jobs = new Map<string, SystemJobRecord>();
  private processingJobs = false;

  async begin(): Promise<PersistenceStore> { return this; }

  entityRepository() {
    return {
      put: async (entity: EntityRecord) => {
        const saved = { ...entity, version: entity.version ?? 1, updatedAt: entity.updatedAt ?? new Date().toISOString() };
        const before = this.entities.get(saved.id) ?? null;
        this.entities.set(saved.id, saved);
        this.appendAudit({operation: before ? 'UPDATE' : 'CREATE', modelType: saved.type, recordId: saved.id, actorId: saved.updatedBy ?? saved.createdBy ?? 'SYSTEM-001', timestamp: saved.updatedAt ?? new Date().toISOString(), changedFields: changedFields(before as any, saved as any), before: before as any, after: saved as any});
        return saved;
      },
      get: async (id: string) => this.entities.get(id) ?? null,
      list: async (type?: string) => [...this.entities.values()].filter((e) => !type || e.type === type),
    };
  }

  relationRepository() {
    return {
      put: async (relation: RelationRecord) => {
        const before = this.relations.get(relation.id) ?? null;
        const now = new Date().toISOString();
        const saved = {...relation, version: relation.version ?? ((before?.version ?? 0)+1), createdAt: relation.createdAt ?? before?.createdAt ?? now, createdBy: relation.createdBy ?? before?.createdBy ?? 'SYSTEM-001', updatedAt: now, updatedBy: relation.updatedBy ?? 'SYSTEM-001'};
        this.relations.set(saved.id, saved);
        this.appendAudit({operation: before ? 'UPDATE' : 'CREATE', modelType:'RELATION', recordId:saved.id, actorId:saved.updatedBy ?? 'SYSTEM-001', timestamp:now, changedFields:changedFields(before as any,saved as any), before:before as any, after:saved as any});
        return saved;
      },
      listByEntity: async (id: string) => [...this.relations.values()].filter((r) => r.fromId === id || r.toId === id),
    };
  }

  eventStore() {
    return {
      append: async (event: EventRecord) => {
        if (!event.eventId) throw new Error('eventId is required');
        if (this.events.some((item) => item.eventId === event.eventId)) throw new Error(`Duplicate eventId: ${event.eventId}`);
        const previousHash = this.events.at(-1)?.eventHash ?? '';
        const now = new Date().toISOString();
        const normalized: EventRecord = {
          ...event,
          createdAt: event.createdAt ?? now,
          createdBy: event.createdBy ?? event.actorId ?? 'SYSTEM-001',
          updatedAt: now,
          updatedBy: event.updatedBy ?? event.actorId ?? 'SYSTEM-001',
          occurredAt: event.occurredAt ?? new Date().toISOString(),
          recordedAt: event.recordedAt ?? new Date().toISOString(),
          previousHash,
        };
        normalized.eventHash = hashEvent(normalized, previousHash);
        this.events.push(normalized);
        this.appendAudit({operation:'CREATE',modelType:'EVENT',recordId:normalized.eventId,actorId:normalized.updatedBy ?? normalized.actorId ?? 'SYSTEM-001',timestamp:normalized.recordedAt ?? now,changedFields:Object.keys(normalized),before:null,after:normalized as any});
        return normalized;
      },
      get: async (id: string) => this.events.find((e) => e.eventId === id) ?? null,
      listByEntity: async (id: string) => this.events.filter((e) => e.entityId === id),
      listAll: async () => [...this.events],
      verifyChain: async () => {
        let previousHash = '';
        for (const event of this.events) {
          if (event.previousHash !== previousHash) return { valid: false, events: this.events.length, head: previousHash || null, failedEventId: event.eventId, reason: 'PREVIOUS_HASH_MISMATCH' };
          if (hashEvent(event, previousHash) !== event.eventHash) return { valid: false, events: this.events.length, head: previousHash || null, failedEventId: event.eventId, reason: 'EVENT_HASH_MISMATCH' };
          previousHash = event.eventHash ?? '';
        }
        return { valid: true, events: this.events.length, head: previousHash || null };
      },
    };
  }


  evidenceRepository() {
    return {
      put: async (evidence: import('./types.js').EvidenceRecord) => { const before=this.evidences.get(evidence.evidenceId) ?? null; const now=new Date().toISOString(); const saved={...evidence,version:evidence.version??((before?.version??0)+1),createdAt:evidence.createdAt??before?.createdAt??now,createdBy:evidence.createdBy??before?.createdBy??'SYSTEM-001',updatedAt:now,updatedBy:evidence.updatedBy??'SYSTEM-001'}; this.evidences.set(saved.evidenceId,saved); this.appendAudit({operation:before?'UPDATE':'CREATE',modelType:'EVIDENCE',recordId:saved.evidenceId,actorId:saved.updatedBy??'SYSTEM-001',timestamp:now,changedFields:changedFields(before as any,saved as any),before:before as any,after:saved as any}); return saved; },
      get: async (id: string) => this.evidences.get(id) ?? null,
      listByEntity: async (entityId: string) => [...this.evidences.values()].filter((e) => e.entityId === entityId),
    };
  }

  projectionStore() {
    return {
      upsert: async (projection: ProjectionRecord) => {
        const before=this.projections.get(`${projection.entityId}::${projection.projectionType}`) ?? null; const now=new Date().toISOString(); const saved = { ...projection, version: projection.version ?? ((before?.version??0)+1), createdAt: projection.createdAt ?? before?.createdAt ?? now, createdBy: projection.createdBy ?? before?.createdBy ?? 'SYSTEM-001', updatedAt: now, updatedBy: projection.updatedBy ?? 'SYSTEM-001' };
        this.projections.set(`${projection.entityId}::${projection.projectionType}`, saved);
        this.appendAudit({operation:before?'UPDATE':'CREATE',modelType:'PROJECTION',recordId:saved.projectionId,actorId:saved.updatedBy??'SYSTEM-001',timestamp:now,changedFields:changedFields(before as any,saved as any),before:before as any,after:saved as any});
        return saved;
      },
      get: async (entityId: string, projectionType: string) => this.projections.get(`${entityId}::${projectionType}`) ?? null,
    };
  }

  auditStore() { return { append: async (record: AuditRecord) => { const hash=hashAudit(record,this.audits.at(-1)?.hash??''); const stored={...record,hash} as AuditRecord & {hash:string}; this.audits.push(stored); return stored; }, listByRecord: async (recordId:string) => this.audits.filter(a=>a.recordId===recordId), listAll: async () => [...this.audits], verify: async () => { let previous=''; for(const a of this.audits){ const {hash,...body}=a; if(hashAudit(body,previous)!==hash) return {valid:false,count:this.audits.length,head:previous||null}; previous=hash; } return {valid:true,count:this.audits.length,head:previous||null}; } }; }
  
  traceRepository() {
    return {
      put: async (trace: SystemTraceRecord) => { this.traces.push(trace); },
      list: async (limit: number = 100) => this.traces.slice(-Math.max(1, limit))
    };
  }

  jobRepository() {
    return {
      put: async (job: SystemJobRecord) => { this.jobs.set(job.id, structuredClone(job)); },
      get: async (id: string) => structuredClone(this.jobs.get(id) ?? null),
      list: async (status?: string) => [...this.jobs.values()].filter((j) => !status || j.status === status).map(j => structuredClone(j)),
      processAvailable: async (maxJobs: number, processor: (job: SystemJobRecord) => Promise<SystemJobRecord>) => {
        if (this.processingJobs) return [];
        this.processingJobs = true;
        const completed: SystemJobRecord[] = [];
        try {
          const queued = [...this.jobs.values()].filter(j => j.status === 'QUEUED').slice(0, Math.max(1, maxJobs));
          for (const job of queued) {
            job.status = 'RUNNING';
            job.updated_at = new Date().toISOString();
            this.jobs.set(job.id, structuredClone(job));
            
            try {
              const result = await processor(job);
              this.jobs.set(result.id, structuredClone(result));
              completed.push(structuredClone(result));
            } catch (error) {
              job.status = 'FAILED';
              job.error_message = error instanceof Error ? error.message : String(error);
              job.updated_at = new Date().toISOString();
              this.jobs.set(job.id, structuredClone(job));
              completed.push(structuredClone(job));
            }
          }
          return completed;
        } finally {
          this.processingJobs = false;
        }
      }
    };
  }

  private appendAudit(input: Omit<AuditRecord,'auditId'>): void { const record=makeAuditRecord(input); const hash=hashAudit(record,this.audits.at(-1)?.hash??''); this.audits.push({...record,hash} as AuditRecord & {hash:string}); }
  close(): void {}
}
