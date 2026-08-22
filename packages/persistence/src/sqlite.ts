import { createRequire } from 'node:module';
import { PersistenceError } from './ports.js';
import { MIGRATIONS } from './schema.js';
import { hashEvent } from './hash.js';
import { makeAuditRecord, changedFields, hashAudit } from './audit.js';
import type { PersistenceStore, EntityRecord, RelationRecord, EventRecord, ProjectionRecord, AuditRecord, SystemTraceRecord, SystemJobRecord } from './types.js';

interface SqliteDatabase {
  pragma(value: string): unknown;
  exec(sql: string): unknown;
  prepare(sql: string): { run(...args: unknown[]): unknown; get(...args: unknown[]): any; all(...args: unknown[]): any[] };
  transaction<T>(fn: () => T): () => T;
  close(): void;
}

const require = createRequire(import.meta.url);

function requireBetterSqlite3(): new (filename: string) => SqliteDatabase {
  try { return require('better-sqlite3') as new (filename: string) => SqliteDatabase; }
  catch (cause) {
    throw new PersistenceError('SQLite adapter requires optional dependency "better-sqlite3". Install it with: npm install better-sqlite3', 'SQLITE_DRIVER_MISSING', cause);
  }
}

function applyMigrations(db: SqliteDatabase): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, migration_id TEXT NOT NULL, applied_at TEXT NOT NULL)');
  for (const migration of MIGRATIONS) {
    const exists = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(migration.version);
    if (exists) continue;
    const run = db.transaction(() => {
      db.exec(migration.sqliteSql);
      db.prepare('INSERT INTO schema_migrations(version, migration_id, applied_at) VALUES(?,?,?)').run(migration.version, migration.id, new Date().toISOString());
    });
    run();
  }
  const latestVersion = MIGRATIONS.at(-1)?.version ?? 0;
  db.prepare(`INSERT INTO meta(key,value) VALUES('schema_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(String(latestVersion));
}

export class SqliteProvider implements PersistenceStore {
  readonly driver = 'sqlite' as const;
  private readonly db: SqliteDatabase;
  private inTransaction = false;

  async begin(): Promise<PersistenceStore> {
    if (!this.inTransaction) {
      this.db.prepare('BEGIN').run();
      this.inTransaction = true;
    }
    return this;
  }
  private auditHead = '';

  constructor(filename = ':memory:') {
    const BetterSqlite3 = requireBetterSqlite3();
    this.db = new BetterSqlite3(filename);
    this.db.pragma('foreign_keys = ON');
    this.db.exec('CREATE TABLE IF NOT EXISTS evidence (evidence_id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, source_type TEXT NOT NULL, reference TEXT, status TEXT, confidence REAL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)');
    applyMigrations(this.db);
  }

  async batch<T>(work: () => Promise<T> | T): Promise<T> {
    this.db.exec('BEGIN');
    try {
      const result = await work();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void { this.db.close(); }

  entityRepository() {
    const db = this.db;
    return {
      put: async (entity: EntityRecord) => {
        const now = new Date().toISOString();
        const saved = { ...entity, version: entity.version ?? 1, updatedAt: now };
        const existing = db.prepare('SELECT * FROM entities WHERE id = ?').get(saved.id) as any; const audit = JSON.stringify({createdAt:saved.createdAt,createdBy:saved.createdBy,updatedAt:saved.updatedAt,updatedBy:saved.updatedBy,version:saved.version}); db.prepare(`INSERT INTO entities(id,type,version,payload_json,updated_at,audit_json) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET type=excluded.type,version=excluded.version,payload_json=excluded.payload_json,updated_at=excluded.updated_at,audit_json=excluded.audit_json`).run(saved.id, saved.type, saved.version, JSON.stringify(saved.payload), now, audit); await writeAudit(db, {operation: existing ? 'UPDATE' : 'CREATE', modelType:saved.type, recordId:saved.id, actorId:saved.updatedBy ?? saved.createdBy ?? 'SYSTEM-001', timestamp:now, changedFields:changedFields(existing?JSON.parse(existing.payload_json):null,saved.payload), before: existing ? {id:existing.id,type:existing.type,version:existing.version,payload:JSON.parse(existing.payload_json),...(JSON.parse(existing.audit_json??'{}'))} : null, after:saved as any});
        return saved;
      },
      get: async (id: string) => {
        const row = db.prepare('SELECT * FROM entities WHERE id = ?').get(id);
        return row ? { id: row.id, type: row.type, version: row.version, payload: JSON.parse(row.payload_json), updatedAt: row.updated_at, ...(JSON.parse(row.audit_json ?? '{}')) } as EntityRecord : null;
      },
      list: async (type?: string) => {
        const rows = type ? db.prepare('SELECT * FROM entities WHERE type = ? ORDER BY id').all(type) : db.prepare('SELECT * FROM entities ORDER BY id').all();
        return rows.map((row) => ({ id: row.id, type: row.type, version: row.version, payload: JSON.parse(row.payload_json), updatedAt: row.updated_at, ...(JSON.parse(row.audit_json ?? '{}')) }) as EntityRecord);
      },
    };
  }

  relationRepository() {
    const db = this.db;
    return {
      put: async (relation: RelationRecord) => {
        db.prepare(`INSERT INTO relations(id,from_id,relation_type,to_id,valid_from,valid_to,payload_json) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET from_id=excluded.from_id,relation_type=excluded.relation_type,to_id=excluded.to_id,valid_from=excluded.valid_from,valid_to=excluded.valid_to,payload_json=excluded.payload_json`).run(relation.id, relation.fromId, relation.type, relation.toId, relation.validFrom ?? null, relation.validTo ?? null, JSON.stringify(relation.payload ?? {}));
        return relation;
      },
      listByEntity: async (entityId: string) => db.prepare('SELECT * FROM relations WHERE from_id = ? OR to_id = ? ORDER BY id').all(entityId, entityId).map((row) => ({ id: row.id, fromId: row.from_id, type: row.relation_type, toId: row.to_id, validFrom: row.valid_from, validTo: row.valid_to, payload: JSON.parse(row.payload_json) } as RelationRecord)),
    };
  }

  eventStore() {
    const db = this.db;
    return {
      append: async (event: EventRecord) => {
        if (!event.eventId) throw new PersistenceError('eventId is required', 'EVENT_ID_REQUIRED');
        const previous = db.prepare('SELECT event_hash FROM event_ledger ORDER BY rowid DESC LIMIT 1').get() as { event_hash?: string } | undefined;
        const previousHash = previous?.event_hash ?? '';
        const occurredAt = event.occurredAt ?? new Date().toISOString();
        const recordedAt = event.recordedAt ?? new Date().toISOString();
        const normalized = { ...event, occurredAt, recordedAt, previousHash };
        const eventHash = hashEvent(normalized, previousHash);
        db.prepare(`INSERT INTO event_ledger(event_id,entity_id,event_type,payload_json,occurred_at,recorded_at,previous_hash,event_hash,actor_id,device_id,source,signature,audit_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(event.eventId, event.entityId, event.eventType, JSON.stringify(event.payload ?? {}), occurredAt, recordedAt, previousHash, eventHash, event.actorId ?? null, event.deviceId ?? null, event.source ?? null, event.signature ?? null, JSON.stringify({createdAt:normalized.createdAt,createdBy:normalized.createdBy,updatedAt:normalized.updatedAt,updatedBy:normalized.updatedBy,version:normalized.version??1})); await writeAudit(db,{operation:'CREATE',modelType:'EVENT',recordId:normalized.eventId,actorId:normalized.updatedBy??normalized.actorId??'SYSTEM-001',timestamp:recordedAt,changedFields:Object.keys(normalized),before:null,after:normalized as any});
        return { ...normalized, eventHash };
      },
      get: async (eventId: string) => {
        const row = db.prepare('SELECT * FROM event_ledger WHERE event_id = ?').get(eventId);
        return row ? normalizeEvent(row) : null;
      },
      listByEntity: async (entityId: string) => db.prepare('SELECT * FROM event_ledger WHERE entity_id = ? ORDER BY rowid').all(entityId).map(normalizeEvent),
      listAll: async () => db.prepare('SELECT * FROM event_ledger ORDER BY rowid').all().map(normalizeEvent),
      verifyChain: async () => {
        const rows = db.prepare('SELECT * FROM event_ledger ORDER BY rowid').all();
        let previousHash = '';
        for (const row of rows) {
          if (row.previous_hash !== previousHash) return { valid: false, events: rows.length, head: previousHash || null, failedEventId: row.event_id, reason: 'PREVIOUS_HASH_MISMATCH' };
          const event = normalizeEvent(row);
          if (hashEvent(event, previousHash) !== row.event_hash) return { valid: false, events: rows.length, head: previousHash || null, failedEventId: row.event_id, reason: 'EVENT_HASH_MISMATCH' };
          previousHash = row.event_hash;
        }
        return { valid: true, events: rows.length, head: previousHash || null };
      },
    };
  }


  evidenceRepository() {
    const db=this.db;
    return {
      put: async (evidence: import('./types.js').EvidenceRecord) => { const saved={...evidence,createdAt:evidence.createdAt??new Date().toISOString()}; const existing=db.prepare('SELECT * FROM evidence WHERE evidence_id=?').get(saved.evidenceId) as any; const audit={createdAt:saved.createdAt,createdBy:saved.createdBy,updatedAt:saved.updatedAt,updatedBy:saved.updatedBy,version:saved.version}; db.prepare('INSERT INTO evidence(evidence_id,entity_id,source_type,reference,status,confidence,payload_json,created_at,audit_json) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(evidence_id) DO UPDATE SET entity_id=excluded.entity_id,source_type=excluded.source_type,reference=excluded.reference,status=excluded.status,confidence=excluded.confidence,payload_json=excluded.payload_json,created_at=excluded.created_at,audit_json=excluded.audit_json').run(saved.evidenceId,saved.entityId,saved.sourceType,saved.reference??null,saved.status??'UNKNOWN',saved.confidence??null,JSON.stringify(saved.payload??{}),saved.createdAt,JSON.stringify(audit)); await writeAudit(db,{operation:existing?'UPDATE':'CREATE',modelType:'EVIDENCE',recordId:saved.evidenceId,actorId:saved.updatedBy??'SYSTEM-001',timestamp:saved.updatedAt??new Date().toISOString(),changedFields:changedFields(existing?JSON.parse(existing.payload_json):null,saved.payload),before:existing?{evidenceId:existing.evidence_id,entityId:existing.entity_id,payload:JSON.parse(existing.payload_json),...(JSON.parse(existing.audit_json??'{}'))}:null,after:saved as any}); return saved; },
      get: async (id:string) => { const r=db.prepare('SELECT * FROM evidence WHERE evidence_id=?').get(id) as any; return r?{evidenceId:r.evidence_id,entityId:r.entity_id,sourceType:r.source_type,reference:r.reference,status:r.status,confidence:r.confidence,payload:JSON.parse(r.payload_json),createdAt:r.created_at,...(JSON.parse(r.audit_json??'{}'))}:null; },
      listByEntity: async (entityId:string) => db.prepare('SELECT * FROM evidence WHERE entity_id=? ORDER BY created_at').all(entityId).map((r:any)=>({evidenceId:r.evidence_id,entityId:r.entity_id,sourceType:r.source_type,reference:r.reference,status:r.status,confidence:r.confidence,payload:JSON.parse(r.payload_json),createdAt:r.created_at,...(JSON.parse(r.audit_json??'{}'))})),
    };
  }

  projectionStore() {
    const db = this.db;
    return {
      upsert: async (projection: ProjectionRecord) => {
        const now = new Date().toISOString();
        const saved = { ...projection, version: projection.version ?? 1, updatedAt: now };
        db.prepare(`INSERT INTO projections(projection_id,entity_id,projection_type,version,payload_json,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(projection_id) DO UPDATE SET version=excluded.version,payload_json=excluded.payload_json,updated_at=excluded.updated_at`).run(saved.projectionId, saved.entityId, saved.projectionType, saved.version, JSON.stringify(saved.payload ?? {}), now);
        return saved;
      },
      get: async (entityId: string, projectionType: string) => {
        const row = db.prepare('SELECT * FROM projections WHERE entity_id = ? AND projection_type = ?').get(entityId, projectionType);
        return row ? { projectionId: row.projection_id, entityId: row.entity_id, projectionType: row.projection_type, version: row.version, payload: JSON.parse(row.payload_json), updatedAt: row.updated_at, ...(JSON.parse(row.audit_json ?? '{}')) } as ProjectionRecord : null;
      },
    };
  }
  auditStore() { const db=this.db; return { append: async (record: AuditRecord) => { const previous=db.prepare('SELECT hash FROM audit_ledger ORDER BY rowid DESC LIMIT 1').get() as any; const previousHash=previous?.hash??''; const hash=hashAudit(record,previousHash); db.prepare('INSERT INTO audit_ledger(audit_id,operation,model_type,record_id,actor_id,timestamp,changed_fields_json,before_json,after_json,previous_hash,hash,correlation_id,reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(record.auditId,record.operation,record.modelType,record.recordId,record.actorId,record.timestamp,JSON.stringify(record.changedFields),record.before?JSON.stringify(record.before):null,record.after?JSON.stringify(record.after):null,previousHash,hash,record.correlationId??null,record.reason??null); return {...record,hash} as AuditRecord; }, listByRecord: async (recordId:string) => db.prepare('SELECT * FROM audit_ledger WHERE record_id=? ORDER BY rowid').all(recordId).map(normalizeAudit), listAll: async () => db.prepare('SELECT * FROM audit_ledger ORDER BY rowid').all().map(normalizeAudit), verify: async () => { const rows=db.prepare('SELECT * FROM audit_ledger ORDER BY rowid').all(); let previous=''; for(const row of rows){ const record=normalizeAudit(row); if(row.previous_hash!==previous || hashAudit(record,previous)!==row.hash) return {valid:false,count:rows.length,head:previous||null}; previous=row.hash; } return {valid:true,count:rows.length,head:previous||null}; } }; }
  
  traceRepository() {
    const db = this.db;
    return {
      put: async (trace: import('./types.js').SystemTraceRecord) => {
        db.prepare('INSERT OR REPLACE INTO system_traces(request_id,correlation_id,route,status_code,duration_ms,error_message,started_at,completed_at) VALUES(?,?,?,?,?,?,?,?)').run(trace.requestId, trace.correlationId, trace.route, trace.statusCode ?? null, trace.durationMs ?? null, trace.error ?? null, trace.startedAt, trace.completedAt ?? null);
      },
      list: async (limit: number = 100) => {
        return db.prepare('SELECT * FROM system_traces ORDER BY started_at DESC LIMIT ?').all(Math.max(1, limit)).map((r: any) => ({
          requestId: r.request_id, correlationId: r.correlation_id, route: r.route, statusCode: r.status_code, durationMs: r.duration_ms, error: r.error_message, startedAt: r.started_at, completedAt: r.completed_at
        }));
      }
    };
  }

  jobRepository() {
    const db = this.db;
    return {
      put: async (job: SystemJobRecord) => {
        db.prepare(`INSERT INTO system_jobs(id, type, status, payload_json, result_json, error_message, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status, payload_json=excluded.payload_json, result_json=excluded.result_json, error_message=excluded.error_message, updated_at=excluded.updated_at`).run(job.id, job.type, job.status, job.payload_json, job.result_json ?? null, job.error_message ?? null, job.created_at, job.updated_at);
      },
      get: async (id: string) => {
        const row = db.prepare('SELECT * FROM system_jobs WHERE id = ?').get(id);
        return row ? { id: row.id, type: row.type, status: row.status, payload_json: row.payload_json, result_json: row.result_json, error_message: row.error_message, created_at: row.created_at, updated_at: row.updated_at } as SystemJobRecord : null;
      },
      list: async (status?: string) => {
        const rows = status ? db.prepare('SELECT * FROM system_jobs WHERE status = ? ORDER BY created_at ASC').all(status) : db.prepare('SELECT * FROM system_jobs ORDER BY created_at ASC').all();
        return rows.map((r: any) => ({ id: r.id, type: r.type, status: r.status, payload_json: r.payload_json, result_json: r.result_json, error_message: r.error_message, created_at: r.created_at, updated_at: r.updated_at } as SystemJobRecord));
      },
      processAvailable: async (maxJobs: number, processor: (job: SystemJobRecord) => Promise<SystemJobRecord>) => {
        const completed: SystemJobRecord[] = [];
        const queued = db.prepare('SELECT * FROM system_jobs WHERE status = ? ORDER BY created_at ASC LIMIT ?').all('QUEUED', Math.max(1, maxJobs));
        
        for (const row of queued) {
          let job = { id: row.id, type: row.type, status: 'RUNNING', payload_json: row.payload_json, result_json: row.result_json, error_message: row.error_message, created_at: row.created_at, updated_at: new Date().toISOString() } as SystemJobRecord;
          db.prepare('UPDATE system_jobs SET status = ?, updated_at = ? WHERE id = ?').run(job.status, job.updated_at, job.id);
          
          try {
            const result = await processor(job);
            job = result;
          } catch (error) {
            job.status = 'FAILED';
            job.error_message = error instanceof Error ? error.message : String(error);
            job.updated_at = new Date().toISOString();
          }
          db.prepare('UPDATE system_jobs SET status = ?, result_json = ?, error_message = ?, updated_at = ? WHERE id = ?').run(job.status, job.result_json ?? null, job.error_message ?? null, job.updated_at, job.id);
          completed.push(job);
        }
        return completed;
      }
    };
  }
}

function normalizeAudit(row:any): AuditRecord { return {auditId:row.audit_id,operation:row.operation,modelType:row.model_type,recordId:row.record_id,actorId:row.actor_id,timestamp:row.timestamp,changedFields:JSON.parse(row.changed_fields_json),before:row.before_json?JSON.parse(row.before_json):null,after:row.after_json?JSON.parse(row.after_json):null,correlationId:row.correlation_id ?? undefined,reason:row.reason ?? undefined}; }

async function writeAudit(db: any, input: Omit<AuditRecord,'auditId'>): Promise<void> { const previous=db.prepare('SELECT hash FROM audit_ledger ORDER BY rowid DESC LIMIT 1').get() as any; const previousHash=previous?.hash??''; const record=makeAuditRecord(input); const hash=hashAudit(record,previousHash); db.prepare('INSERT INTO audit_ledger(audit_id,operation,model_type,record_id,actor_id,timestamp,changed_fields_json,before_json,after_json,previous_hash,hash,correlation_id,reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(record.auditId,record.operation,record.modelType,record.recordId,record.actorId,record.timestamp,JSON.stringify(record.changedFields),record.before?JSON.stringify(record.before):null,record.after?JSON.stringify(record.after):null,previousHash,hash,record.correlationId??null,record.reason??null); }

function normalizeEvent(row: any): EventRecord {
  return {
    eventId: row.event_id,
    entityId: row.entity_id,
    eventType: row.event_type,
    payload: JSON.parse(row.payload_json),
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
    previousHash: row.previous_hash,
    eventHash: row.event_hash,
    actorId: row.actor_id,
    deviceId: row.device_id,
    source: row.source,
    signature: row.signature,
    ...(JSON.parse(row.audit_json ?? '{}')),
  };
}
