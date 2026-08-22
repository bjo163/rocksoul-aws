import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { hashEvent } from './hash.js';
import { makeAuditRecord, changedFields, hashAudit } from './audit.js';
import type { AuditRecord } from './types.js';
import type { PersistenceStore, EntityRecord, RelationRecord, EventRecord, ProjectionRecord, SystemTraceRecord, SystemJobRecord } from './types.js';

type State = { entities: EntityRecord[]; relations: RelationRecord[]; events: EventRecord[]; projections: ProjectionRecord[]; evidences?: import('./types.js').EvidenceRecord[]; audits?: AuditRecord[]; traces?: SystemTraceRecord[]; jobs?: SystemJobRecord[] };

export class FileProvider implements PersistenceStore {
  private readonly file: string;
  private state: State = { entities: [], relations: [], events: [], projections: [] };
  private loaded = false;
  private loading: Promise<void> | null = null;
  private batchDepth = 0;
  private auditChainHead = '';
  private dirty = false;
  private flushQueue: Promise<void> = Promise.resolve();
  private flushSequence = 0;
  
  async begin(): Promise<PersistenceStore> { return this; }
  constructor(dir = './data/runtime') { this.file = join(dir, 'universe-store.json'); }
  private async ensure(): Promise<void> {
    if (this.loaded) return;
    if (this.loading) { await this.loading; return; }
    this.loading = (async () => {
      console.log('FILE PROVIDER LOAD FROM:', this.file);
      await mkdir(dirname(this.file), { recursive: true });
      try {
        const data = await readFile(this.file, 'utf8');
        this.state = JSON.parse(data);
        if (!this.state.evidences) this.state.evidences = [];
        if (!this.state.audits) this.state.audits = [];
        if (!this.state.traces) this.state.traces = [];
        if (!this.state.jobs) this.state.jobs = [];
        this.auditChainHead = this.state.audits.at(-1)?.hash ?? '';
      } catch {
        this.state = { entities: [], relations: [], events: [], projections: [], evidences: [], audits: [], traces: [], jobs: [] };
        this.auditChainHead = '';
      }
      this.loaded = true;
    })();
    try { await this.loading; } finally { this.loading = null; }
  }
  private async flush(): Promise<void> {
    if (this.batchDepth > 0) { this.dirty = true; return; }
    const payload = JSON.stringify(this.state, null, 2);
    const tmp = `${this.file}.${process.pid}.${++this.flushSequence}.tmp`;
    this.dirty = false;
    const write = async () => { await writeFile(tmp, payload); await rename(tmp, this.file); };
    this.flushQueue = this.flushQueue.then(write, write);
    await this.flushQueue;
  }
  readonly driver = 'file' as const;
  async batch<T>(work: () => Promise<T> | T): Promise<T> {
    await this.ensure();
    const snapshot = JSON.parse(JSON.stringify(this.state)) as State;
    this.batchDepth++;
    try {
      return await work();
    } catch (error) {
      this.state = snapshot;
      this.dirty = false;
      throw error;
    } finally {
      this.batchDepth--;
      if (this.batchDepth === 0 && this.dirty) await this.flush();
    }
  }
  entityRepository() {
    return {
      put: async (e: EntityRecord) => { await this.ensure(); const i = this.state.entities.findIndex(x => x.id === e.id); const now = new Date().toISOString(); const existing = i >= 0 ? this.state.entities[i] : undefined; const requested = { ...e, version: e.version ?? ((existing?.version ?? 0) + 1), createdAt: e.createdAt ?? existing?.createdAt ?? now, createdBy: e.createdBy ?? existing?.createdBy ?? 'SYSTEM-001', updatedBy: e.updatedBy ?? existing?.updatedBy ?? 'SYSTEM-001' }; const unchanged = Boolean(existing && JSON.stringify({type:existing.type,version:existing.version,payload:existing.payload,createdAt:existing.createdAt,createdBy:existing.createdBy}) === JSON.stringify({type:requested.type,version:requested.version,payload:requested.payload,createdAt:requested.createdAt,createdBy:requested.createdBy})); if (unchanged) return existing!; const saved = { ...requested, updatedAt: now }; if (i >= 0) this.state.entities[i] = saved; else this.state.entities.push(saved); await this.appendAuditInternal({ operation: existing ? 'UPDATE' : 'CREATE', modelType: saved.type, recordId: saved.id, actorId: saved.updatedBy ?? 'SYSTEM-001', timestamp: now, changedFields: changedFields(existing as any, saved as any), before: (existing as any) ?? null, after: saved as any }); await this.flush(); return saved; },
      get: async (id: string) => { await this.ensure(); return this.state.entities.find(x => x.id === id) ?? null; },
      list: async (type?: string) => { await this.ensure(); return this.state.entities.filter(e => !type || e.type === type); },
    };
  }
  relationRepository() {
    return {
      put: async (r: RelationRecord) => { await this.ensure(); const i = this.state.relations.findIndex(x => x.id === r.id); const now = new Date().toISOString(); const existing = i >= 0 ? this.state.relations[i] : undefined; const saved = { ...r, version: r.version ?? ((existing?.version ?? 0) + 1), createdAt: r.createdAt ?? existing?.createdAt ?? now, createdBy: r.createdBy ?? existing?.createdBy ?? 'SYSTEM-001', updatedAt: now, updatedBy: r.updatedBy ?? 'SYSTEM-001' }; if (i >= 0) this.state.relations[i] = saved; else this.state.relations.push(saved); await this.appendAuditInternal({ operation: existing ? 'UPDATE' : 'CREATE', modelType: 'RELATION', recordId: saved.id, actorId: saved.updatedBy ?? 'SYSTEM-001', timestamp: now, changedFields: changedFields(existing as any, saved as any), before: (existing as any) ?? null, after: saved as any }); await this.flush(); return saved; },
      listByEntity: async (id: string) => { await this.ensure(); return this.state.relations.filter(r => r.fromId === id || r.toId === id); },
    };
  }
  eventStore() {
    return {
      append: async (e: EventRecord) => { await this.ensure(); const previousHash = this.state.events.at(-1)?.eventHash ?? ''; const now = new Date().toISOString(); const normalized = { ...e, createdAt: e.createdAt ?? now, createdBy: e.createdBy ?? e.actorId ?? 'SYSTEM-001', updatedAt: now, updatedBy: e.updatedBy ?? e.actorId ?? 'SYSTEM-001', occurredAt: e.occurredAt ?? now, recordedAt: e.recordedAt ?? now, previousHash }; const eventHash = hashEvent(normalized, previousHash); const saved = { ...normalized, eventHash }; this.state.events.push(saved); await this.appendAuditInternal({ operation: 'CREATE', modelType: 'EVENT', recordId: saved.eventId, actorId: saved.updatedBy ?? saved.actorId ?? 'SYSTEM-001', timestamp: saved.recordedAt ?? now, changedFields: Object.keys(saved), before: null, after: saved as any }); await this.flush(); return saved; },
      get: async (id: string) => { await this.ensure(); return this.state.events.find(e => e.eventId === id) ?? null; },
      listByEntity: async (id: string) => { await this.ensure(); return this.state.events.filter(e => e.entityId === id); },
      listAll: async () => { await this.ensure(); return [...this.state.events]; },
      verifyChain: async () => { await this.ensure(); let previousHash = ''; for (const e of this.state.events) { if (e.previousHash !== previousHash || hashEvent(e, previousHash) !== e.eventHash) return { valid:false, events:this.state.events.length, head:previousHash||null, failedEventId:e.eventId, reason:'EVENT_HASH_MISMATCH' }; previousHash = e.eventHash ?? ''; } return { valid:true, events:this.state.events.length, head:previousHash||null }; },
    };
  }

  evidenceRepository() {
    return {
      put: async (evidence: import('./types.js').EvidenceRecord) => { await this.ensure(); const now=new Date().toISOString(); const existing=(this.state.evidences??[]).find(x=>x.evidenceId===evidence.evidenceId); const saved={...evidence,version:evidence.version??((existing?.version??0)+1),createdAt:evidence.createdAt??existing?.createdAt??now,createdBy:evidence.createdBy??existing?.createdBy??'SYSTEM-001',updatedAt:now,updatedBy:evidence.updatedBy??'SYSTEM-001'}; const i=(this.state.evidences??[]).findIndex(x=>x.evidenceId===saved.evidenceId); if(i>=0)this.state.evidences![i]=saved; else this.state.evidences!.push(saved); await this.appendAuditInternal({operation:existing?'UPDATE':'CREATE',modelType:'EVIDENCE',recordId:saved.evidenceId,actorId:saved.updatedBy??'SYSTEM-001',timestamp:now,changedFields:changedFields(existing as any,saved as any),before:(existing as any)??null,after:saved as any}); await this.flush(); return saved; },
      get: async (id:string) => { await this.ensure(); return (this.state.evidences??[]).find(e=>e.evidenceId===id)??null; },
      listByEntity: async (entityId:string) => { await this.ensure(); return (this.state.evidences??[]).filter(e=>e.entityId===entityId); },
    };
  }

  projectionStore() {
    return {
      upsert: async (p: ProjectionRecord) => { await this.ensure(); const i = this.state.projections.findIndex(x => x.projectionId === p.projectionId); const now=new Date().toISOString(); const existing=this.state.projections.find(x=>x.projectionId===p.projectionId); const saved = { ...p, version:p.version ?? ((existing?.version??0)+1), createdAt:p.createdAt??existing?.createdAt??now, createdBy:p.createdBy??existing?.createdBy??'SYSTEM-001', updatedAt:now, updatedBy:p.updatedBy??'SYSTEM-001' }; if (i >= 0) this.state.projections[i]=saved; else this.state.projections.push(saved); await this.appendAuditInternal({operation:existing?'UPDATE':'CREATE',modelType:'PROJECTION',recordId:saved.projectionId,actorId:saved.updatedBy??'SYSTEM-001',timestamp:now,changedFields:changedFields(existing as any,saved as any),before:(existing as any)??null,after:saved as any}); await this.flush(); return saved; },
      get: async (entityId: string, projectionType: string) => { await this.ensure(); return this.state.projections.find(p => p.entityId===entityId && p.projectionType===projectionType) ?? null; },
    };
  }
  private async appendAuditInternal(input: Omit<AuditRecord, 'auditId'>): Promise<void> { const record = makeAuditRecord(input); const hash = hashAudit(record, this.auditChainHead); const stored = { ...record, after: record.after ? structuredClone(record.after) : null, before: record.before ? structuredClone(record.before) : null, hash } as AuditRecord & { hash: string }; this.auditChainHead = hash; (this.state.audits ??= []).push(stored); }
  auditStore() { return { append: async (record: AuditRecord) => { await this.ensure(); const hash=hashAudit(record,this.auditChainHead); const stored={...record,hash} as AuditRecord & {hash:string}; this.auditChainHead=hash; (this.state.audits??=[]).push(stored); await this.flush(); return stored; }, listByRecord: async (recordId:string) => { await this.ensure(); return (this.state.audits??[]).filter(a=>a.recordId===recordId); }, listAll: async () => { await this.ensure(); return [...(this.state.audits??[])]; }, verify: async () => { await this.ensure(); let previous=''; for (const item of this.state.audits??[]) { const {hash,...body}=item as any; const expected=hashAudit(body,previous); if(expected!==hash) return {valid:false,count:(this.state.audits??[]).length,head:previous||null}; previous=hash; } return {valid:true,count:(this.state.audits??[]).length,head:previous||null}; } }; }
  
  traceRepository() {
    return {
      put: async (trace: SystemTraceRecord) => {
        await this.ensure();
        if (!this.state.traces) this.state.traces = [];
        this.state.traces.push(trace);
        this.dirty = true;
        if (this.batchDepth === 0) await this.flush();
      },
      list: async (limit: number = 100) => {
        await this.ensure();
        return (this.state.traces ?? []).slice(-Math.max(1, limit));
      }
    };
  }

  jobRepository() {
    return {
      put: async (job: SystemJobRecord) => {
        await this.ensure();
        if (!this.state.jobs) this.state.jobs = [];
        const idx = this.state.jobs.findIndex(j => j.id === job.id);
        if (idx >= 0) this.state.jobs[idx] = structuredClone(job);
        else this.state.jobs.push(structuredClone(job));
        this.dirty = true;
        if (this.batchDepth === 0) await this.flush();
      },
      get: async (id: string) => {
        await this.ensure();
        const job = (this.state.jobs ?? []).find(j => j.id === id);
        return job ? structuredClone(job) : null;
      },
      list: async (status?: string) => {
        await this.ensure();
        return (this.state.jobs ?? []).filter(j => !status || j.status === status).map(j => structuredClone(j));
      },
      processAvailable: async (maxJobs: number, processor: (job: SystemJobRecord) => Promise<SystemJobRecord>) => {
        await this.ensure();
        if (!this.state.jobs) this.state.jobs = [];
        const completed: SystemJobRecord[] = [];
        const queued = this.state.jobs.filter(j => j.status === 'QUEUED').slice(0, Math.max(1, maxJobs));
        
        for (const job of queued) {
          job.status = 'RUNNING';
          job.updated_at = new Date().toISOString();
          this.dirty = true;
          await this.flush();
          
          try {
            const result = await processor(job);
            const idx = this.state.jobs.findIndex(j => j.id === result.id);
            if (idx >= 0) this.state.jobs[idx] = structuredClone(result);
            completed.push(structuredClone(result));
          } catch (error) {
            job.status = 'FAILED';
            job.error_message = error instanceof Error ? error.message : String(error);
            job.updated_at = new Date().toISOString();
            completed.push(structuredClone(job));
          }
          this.dirty = true;
          await this.flush();
        }
        return completed;
      }
    };
  }

  async close(): Promise<void> { if (this.loaded) await this.flush(); }
}
