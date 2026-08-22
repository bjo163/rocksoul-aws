import { createRequire } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PersistenceError } from './ports.js';
import { MIGRATIONS } from './schema.js';
import { hashEvent } from './hash.js';
import { makeAuditRecord, changedFields, hashAudit } from './audit.js';
import type { PersistenceStore, EntityRecord, RelationRecord, EventRecord, ProjectionRecord, AuditRecord, EvidenceRecord, SystemTraceRecord, SystemJobRecord } from './types.js';

interface PgResult { rows: any[] }
interface PgClient { query(sql: string, params?: unknown[]): Promise<PgResult>; release(): void }
interface PgPool { query(sql: string, params?: unknown[]): Promise<PgResult>; connect(): Promise<PgClient>; end(): Promise<void> }

const require = createRequire(import.meta.url);

function requirePg(): { Pool: new (config?: Record<string, unknown>) => PgPool } {
  try { return require('pg') as { Pool: new (config?: Record<string, unknown>) => PgPool }; }
  catch (cause) { throw new PersistenceError('PostgreSQL adapter requires optional dependency "pg". Install it with: npm install pg', 'POSTGRES_DRIVER_MISSING', cause); }
}

export class PostgresProvider implements PersistenceStore {
  readonly driver = 'postgres' as const;
  private readonly pool: PgPool;
  private readonly readyPromise: Promise<void>;
  private inTransaction = false;
  private readonly txStorage = new AsyncLocalStorage<PgClient>();

  async begin(): Promise<PersistenceStore> {
    throw new PersistenceError('Use store.batch() for PostgreSQL transactions; begin() cannot safely expose a connection across async scopes.', 'POSTGRES_BEGIN_UNSUPPORTED');
  }

  private query(sql: string, params?: unknown[]): Promise<PgResult> {
    const client = this.txStorage.getStore();
    return client ? client.query(sql, params) : this.pool.query(sql, params);
  }

  constructor(config: Record<string, unknown> = {}) {
    const { Pool } = requirePg();
    this.pool = new Pool(config);
    this.readyPromise = this.migrate();
  }

  private async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [837462901]);
      const migrationRegistry = await client.query(`SELECT to_regclass('public.schema_migrations') AS name`);
      if (!migrationRegistry.rows[0]?.name) {
        await client.query('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, migration_id TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL)');
      }
      for (const migration of MIGRATIONS) {
        const existing = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [migration.version]);
        if (existing.rows.length) continue;
        await client.query('BEGIN');
        try {
          await client.query(migration.postgresSql);
          await client.query('INSERT INTO schema_migrations(version,migration_id,applied_at) VALUES($1,$2,$3)', [migration.version, migration.id, new Date().toISOString()]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
      const latestVersion = MIGRATIONS.at(-1)?.version ?? 0;
      await client.query(
        `INSERT INTO meta(key,value) VALUES('schema_version',$1)
         ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`,
        [String(latestVersion)],
      );
      await client.query('SELECT pg_advisory_unlock($1)', [837462901]);
    } catch (error) {
      try { await client.query('SELECT pg_advisory_unlock($1)', [837462901]); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async ready(): Promise<void> { await this.readyPromise; }

  async batch<T>(work: () => Promise<T> | T): Promise<T> {
    await this.ready();
    const existing = this.txStorage.getStore();
    if (existing) return await work();
    const client = await this.pool.connect();
    await client.query('BEGIN');
    try {
      const result = await this.txStorage.run(client, () => work());
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async close(): Promise<void> { await this.readyPromise; await this.pool.end(); }

  entityRepository() {
    return {
      put: async (entity: EntityRecord) => {
        const now = new Date().toISOString();
        const current=await this.query('SELECT * FROM entities WHERE id=$1',[entity.id]); const existing=current.rows[0]; const previousAudit=existing?.audit_json??{}; const saved = { ...entity, version: entity.version ?? ((existing?.version??0)+1), createdAt: entity.createdAt ?? previousAudit.createdAt ?? now, createdBy: entity.createdBy ?? previousAudit.createdBy ?? 'SYSTEM-001', updatedAt: now, updatedBy: entity.updatedBy ?? 'SYSTEM-001' };
        await this.query(`INSERT INTO entities(id,type,version,payload_json,updated_at,audit_json) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET type=EXCLUDED.type,version=EXCLUDED.version,payload_json=EXCLUDED.payload_json,updated_at=EXCLUDED.updated_at,audit_json=EXCLUDED.audit_json`, [saved.id, saved.type, saved.version, JSON.stringify(saved.payload), now, JSON.stringify({createdAt:saved.createdAt,createdBy:saved.createdBy,updatedAt:saved.updatedAt,updatedBy:saved.updatedBy,version:saved.version})]);
        await writeAudit({ query: (sql: string, params?: unknown[]) => this.query(sql, params) },{operation:existing?'UPDATE':'CREATE',modelType:saved.type,recordId:saved.id,actorId:saved.updatedBy??saved.createdBy??'SYSTEM-001',timestamp:now,changedFields:changedFields(existing?existing.payload_json:null,saved.payload),before:existing?{id:existing.id,type:existing.type,version:existing.version,payload:existing.payload_json,audit:existing.audit_json}:null,after:saved as any});
        return saved;
      },
      get: async (id: string) => { const result = await this.query('SELECT * FROM entities WHERE id = $1', [id]); const row = result.rows[0]; return row ? { id: row.id, type: row.type, version: row.version, payload: row.payload_json, updatedAt: row.updated_at, ...(row.audit_json??{}) } as EntityRecord : null; },
      list: async (type?: string) => { const result = type ? await this.query('SELECT * FROM entities WHERE type = $1 ORDER BY id', [type]) : await this.query('SELECT * FROM entities ORDER BY id'); return result.rows.map((row) => ({ id: row.id, type: row.type, version: row.version, payload: row.payload_json, updatedAt: row.updated_at, ...(row.audit_json??{}) } as EntityRecord)); },
    };
  }

  relationRepository() {
    return {
      put: async (relation: RelationRecord) => { await this.query(`INSERT INTO relations(id,from_id,relation_type,to_id,valid_from,valid_to,payload_json) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET from_id=EXCLUDED.from_id,relation_type=EXCLUDED.relation_type,to_id=EXCLUDED.to_id,valid_from=EXCLUDED.valid_from,valid_to=EXCLUDED.valid_to,payload_json=EXCLUDED.payload_json`, [relation.id, relation.fromId, relation.type, relation.toId, relation.validFrom ?? null, relation.validTo ?? null, JSON.stringify(relation.payload ?? {})]); return relation; },
      listByEntity: async (entityId: string) => { const result = await this.query('SELECT * FROM relations WHERE from_id = $1 OR to_id = $1 ORDER BY id', [entityId]); return result.rows.map((row) => ({ id: row.id, fromId: row.from_id, type: row.relation_type, toId: row.to_id, validFrom: row.valid_from, validTo: row.valid_to, payload: row.payload_json } as RelationRecord)); },
    };
  }

  eventStore() {
    return {
      append: async (event: EventRecord) => {
        const execute = async () => {
          await this.query('SELECT pg_advisory_xact_lock($1)', [837462902]);
          const previous = await this.query('SELECT event_hash FROM event_ledger ORDER BY occurred_at DESC, event_id DESC LIMIT 1');
          const previousHash = previous.rows[0]?.event_hash ?? '';
          const occurredAt = event.occurredAt ?? new Date().toISOString();
          const recordedAt = event.recordedAt ?? new Date().toISOString();
          const normalized = { ...event, createdAt:event.createdAt??recordedAt, createdBy:event.createdBy??event.actorId??'SYSTEM-001', updatedAt:recordedAt, updatedBy:event.updatedBy??event.actorId??'SYSTEM-001', occurredAt, recordedAt, previousHash };
          const eventHash = hashEvent(normalized, previousHash);
          await this.query(`INSERT INTO event_ledger(event_id,entity_id,event_type,payload_json,occurred_at,recorded_at,previous_hash,event_hash,actor_id,device_id,source,signature,audit_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [event.eventId, event.entityId, event.eventType, JSON.stringify(event.payload ?? {}), occurredAt, recordedAt, previousHash, eventHash, event.actorId ?? null, event.deviceId ?? null, event.source ?? null, event.signature ?? null, JSON.stringify({createdAt:normalized.createdAt,createdBy:normalized.createdBy,updatedAt:normalized.updatedAt,updatedBy:normalized.updatedBy,version:normalized.version??1})]);
          await writeAudit({ query: (sql: string, params?: unknown[]) => this.query(sql, params) },{operation:'CREATE',modelType:'EVENT',recordId:normalized.eventId,actorId:normalized.updatedBy??normalized.actorId??'SYSTEM-001',timestamp:recordedAt,changedFields:Object.keys(normalized),before:null,after:normalized as any});
          return { ...normalized, eventHash };
        };
        return this.txStorage.getStore() ? await execute() : await this.batch(execute);
      },
      get: async (eventId: string) => { const result = await this.query('SELECT * FROM event_ledger WHERE event_id = $1', [eventId]); return result.rows[0] ? normalizeEvent(result.rows[0]) : null; },
      listByEntity: async (entityId: string) => { const result = await this.query('SELECT * FROM event_ledger WHERE entity_id = $1 ORDER BY occurred_at, event_id', [entityId]); return result.rows.map(normalizeEvent); },
      listAll: async () => { const result = await this.query('SELECT * FROM event_ledger ORDER BY occurred_at, event_id'); return result.rows.map(normalizeEvent); },
      verifyChain: async () => { const result = await this.query('SELECT * FROM event_ledger ORDER BY occurred_at, event_id'); let previousHash = ''; for (const row of result.rows) { if (row.previous_hash !== previousHash) return { valid: false, events: result.rows.length, head: previousHash || null, failedEventId: row.event_id, reason: 'PREVIOUS_HASH_MISMATCH' }; const event = normalizeEvent(row); if (hashEvent(event, previousHash) !== row.event_hash) return { valid: false, events: result.rows.length, head: previousHash || null, failedEventId: row.event_id, reason: 'EVENT_HASH_MISMATCH' }; previousHash = row.event_hash; } return { valid: true, events: result.rows.length, head: previousHash || null }; },
    };
  }


  evidenceRepository() {
    const pool = { query: (sql: string, params?: unknown[]) => this.query(sql, params) };
    return {
      put: async (evidence: import('./types.js').EvidenceRecord) => { const saved={...evidence,version:evidence.version??1,createdAt:evidence.createdAt??new Date().toISOString(),createdBy:evidence.createdBy??'SYSTEM-001',updatedAt:new Date().toISOString(),updatedBy:evidence.updatedBy??'SYSTEM-001'}; await this.query(`CREATE TABLE IF NOT EXISTS evidence (evidence_id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, source_type TEXT NOT NULL, reference TEXT, status TEXT, confidence DOUBLE PRECISION, payload_json JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL, audit_json JSONB NOT NULL DEFAULT '{}')`); await this.query('INSERT INTO evidence(evidence_id,entity_id,source_type,reference,status,confidence,payload_json,created_at,audit_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(evidence_id) DO UPDATE SET entity_id=EXCLUDED.entity_id,source_type=EXCLUDED.source_type,reference=EXCLUDED.reference,status=EXCLUDED.status,confidence=EXCLUDED.confidence,payload_json=EXCLUDED.payload_json,created_at=EXCLUDED.created_at',[saved.evidenceId,saved.entityId,saved.sourceType,saved.reference??null,saved.status??'UNKNOWN',saved.confidence??null,JSON.stringify(saved.payload??{}),saved.createdAt,JSON.stringify({createdAt:saved.createdAt,createdBy:saved.createdBy,updatedAt:saved.updatedAt,updatedBy:saved.updatedBy,version:saved.version})]); await writeAudit({ query: (sql: string, params?: unknown[]) => this.query(sql, params) },{operation:'CREATE',modelType:'EVIDENCE',recordId:saved.evidenceId,actorId:saved.updatedBy??'SYSTEM-001',timestamp:saved.updatedAt??new Date().toISOString(),changedFields:Object.keys(saved),before:null,after:saved as any}); return saved; },
      get: async (id:string) => { const r=await this.query('SELECT * FROM evidence WHERE evidence_id=$1',[id]); const row=r.rows[0]; return row?{evidenceId:row.evidence_id,entityId:row.entity_id,sourceType:row.source_type,reference:row.reference,status:row.status,confidence:row.confidence,payload:row.payload_json,createdAt:row.created_at,...(row.audit_json??{})}:null; },
      listByEntity: async (entityId:string) => { const r=await this.query('SELECT * FROM evidence WHERE entity_id=$1 ORDER BY created_at',[entityId]); return r.rows.map(row=>({evidenceId:row.evidence_id,entityId:row.entity_id,sourceType:row.source_type,reference:row.reference,status:row.status,confidence:row.confidence,payload:row.payload_json,createdAt:row.created_at,...(row.audit_json??{})})); },
    };
  }

  projectionStore() {
    return {
      upsert: async (projection: ProjectionRecord) => { const now = new Date().toISOString(); const saved = { ...projection, version: projection.version ?? 1, createdAt: projection.createdAt ?? now, createdBy: projection.createdBy ?? 'SYSTEM-001', updatedAt: now, updatedBy: projection.updatedBy ?? 'SYSTEM-001' }; await this.query(`INSERT INTO projections(projection_id,entity_id,projection_type,version,payload_json,updated_at,audit_json) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(projection_id) DO UPDATE SET version=EXCLUDED.version,payload_json=EXCLUDED.payload_json,updated_at=EXCLUDED.updated_at,audit_json=EXCLUDED.audit_json`, [saved.projectionId, saved.entityId, saved.projectionType, saved.version, JSON.stringify(saved.payload ?? {}), now, JSON.stringify({createdAt:saved.createdAt,createdBy:saved.createdBy,updatedAt:saved.updatedAt,updatedBy:saved.updatedBy,version:saved.version})]); await writeAudit({ query: (sql: string, params?: unknown[]) => this.query(sql, params) },{operation:'CREATE',modelType:'PROJECTION',recordId:saved.projectionId,actorId:saved.updatedBy??'SYSTEM-001',timestamp:now,changedFields:Object.keys(saved),before:null,after:saved as any}); return saved; },
      get: async (entityId: string, projectionType: string) => { const result = await this.query('SELECT * FROM projections WHERE entity_id = $1 AND projection_type = $2', [entityId, projectionType]); const row = result.rows[0]; return row ? { projectionId: row.projection_id, entityId: row.entity_id, projectionType: row.projection_type, version: row.version, payload: row.payload_json, updatedAt: row.updated_at, ...(row.audit_json??{}) } as ProjectionRecord : null; },
    };
  }
  auditStore() { const pool = { query: (sql: string, params?: unknown[]) => this.query(sql, params) }; return { append: async (record: AuditRecord) => { const execute = () => writeAudit(pool, record); return this.txStorage.getStore() ? await execute() : await this.batch(execute); }, listByRecord: async (recordId:string) => { const r=await this.query('SELECT * FROM audit_ledger WHERE record_id=$1 ORDER BY timestamp,audit_id',[recordId]); return r.rows.map(normalizeAudit); }, listAll: async () => { const r=await this.query('SELECT * FROM audit_ledger ORDER BY timestamp,audit_id'); return r.rows.map(normalizeAudit); }, verify: async () => { const r=await this.query('SELECT * FROM audit_ledger ORDER BY timestamp,audit_id'); let previous=''; for(const row of r.rows){const rec=normalizeAudit(row); if(row.previous_hash!==previous || hashAudit(rec,previous)!==row.hash) return {valid:false,count:r.rows.length,head:previous||null}; previous=row.hash;} return {valid:true,count:r.rows.length,head:previous||null}; } }; }
  
  traceRepository() {
    return {
      put: async (trace: import('./types.js').SystemTraceRecord) => {
        await this.query(
          'INSERT INTO system_traces(request_id,correlation_id,route,status_code,duration_ms,error_message,started_at,completed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(request_id) DO UPDATE SET correlation_id=EXCLUDED.correlation_id,route=EXCLUDED.route,status_code=EXCLUDED.status_code,duration_ms=EXCLUDED.duration_ms,error_message=EXCLUDED.error_message,started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at',
          [trace.requestId, trace.correlationId, trace.route, trace.statusCode ?? null, trace.durationMs ?? null, trace.error ?? null, trace.startedAt, trace.completedAt ?? null]
        );
      },
      list: async (limit: number = 100) => {
        const result = await this.query('SELECT * FROM system_traces ORDER BY started_at DESC, request_id DESC LIMIT $1', [limit]);
        return result.rows.map((r: any) => ({ requestId: r.request_id, correlationId: r.correlation_id, route: r.route, statusCode: r.status_code, durationMs: r.duration_ms, error: r.error_message, startedAt: r.started_at, completedAt: r.completed_at }));
      }
    };
  }

  jobRepository() {
    return {
      put: async (job: SystemJobRecord) => {
        await this.query(`INSERT INTO system_jobs(id, type, status, payload_json, result_json, error_message, created_at, updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status, payload_json=EXCLUDED.payload_json, result_json=EXCLUDED.result_json, error_message=EXCLUDED.error_message, updated_at=EXCLUDED.updated_at`, [job.id, job.type, job.status, job.payload_json, job.result_json ?? null, job.error_message ?? null, job.created_at, job.updated_at]);
      },
      get: async (id: string) => {
        const result = await this.query('SELECT * FROM system_jobs WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return { id: row.id, type: row.type, status: row.status, payload_json: row.payload_json, result_json: row.result_json, error_message: row.error_message, created_at: row.created_at, updated_at: row.updated_at } as SystemJobRecord;
      },
      list: async (status?: string) => {
        const result = status ? await this.query('SELECT * FROM system_jobs WHERE status = $1 ORDER BY created_at ASC', [status]) : await this.query('SELECT * FROM system_jobs ORDER BY created_at ASC');
        return result.rows.map((r: any) => ({ id: r.id, type: r.type, status: r.status, payload_json: r.payload_json, result_json: r.result_json, error_message: r.error_message, created_at: r.created_at, updated_at: r.updated_at } as SystemJobRecord));
      },
      processAvailable: async (maxJobs: number, processor: (job: SystemJobRecord) => Promise<SystemJobRecord>) => {
        const completed: SystemJobRecord[] = [];
        const result = await this.query(`UPDATE system_jobs SET status = 'RUNNING', updated_at = NOW() WHERE id IN (SELECT id FROM system_jobs WHERE status = 'QUEUED' ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT $1) RETURNING *`, [Math.max(1, maxJobs)]);
        
        for (const row of result.rows) {
          let job = { id: row.id, type: row.type, status: row.status, payload_json: row.payload_json, result_json: row.result_json, error_message: row.error_message, created_at: row.created_at, updated_at: row.updated_at } as SystemJobRecord;
          try {
            const resultJob = await processor(job);
            job = resultJob;
          } catch (error) {
            job.status = 'FAILED';
            job.error_message = error instanceof Error ? error.message : String(error);
            job.updated_at = new Date().toISOString();
          }
          await this.query('UPDATE system_jobs SET status = $1, result_json = $2, error_message = $3, updated_at = $4 WHERE id = $5', [job.status, job.result_json ?? null, job.error_message ?? null, job.updated_at, job.id]);
          completed.push(job);
        }
        return completed;
      }
    };
  }
}

function normalizeAudit(row:any): AuditRecord { return {auditId:row.audit_id,operation:row.operation,modelType:row.model_type,recordId:row.record_id,actorId:row.actor_id,timestamp:row.timestamp,changedFields:row.changed_fields_json,before:row.before_json,after:row.after_json,correlationId:row.correlation_id ?? undefined,reason:row.reason ?? undefined,previousHash:row.previous_hash ?? undefined,hash:row.hash ?? undefined}; }

async function writeAudit(pool:any,input:Omit<AuditRecord,'auditId'>):Promise<AuditRecord>{const previous=await pool.query('SELECT hash FROM audit_ledger ORDER BY timestamp DESC,audit_id DESC LIMIT 1');const previousHash=previous.rows[0]?.hash??'';const record=makeAuditRecord(input);const hash=hashAudit(record,previousHash);await pool.query('INSERT INTO audit_ledger(audit_id,operation,model_type,record_id,actor_id,timestamp,changed_fields_json,before_json,after_json,previous_hash,hash,correlation_id,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[record.auditId,record.operation,record.modelType,record.recordId,record.actorId,record.timestamp,JSON.stringify(record.changedFields),record.before?JSON.stringify(record.before):null,record.after?JSON.stringify(record.after):null,previousHash,hash,record.correlationId??null,record.reason??null]); return {...record,previousHash,hash};}

function normalizeEvent(row: any): EventRecord {
  return { eventId: row.event_id, entityId: row.entity_id, eventType: row.event_type, payload: row.payload_json, occurredAt: row.occurred_at, recordedAt: row.recorded_at, previousHash: row.previous_hash, eventHash: row.event_hash, actorId: row.actor_id, deviceId: row.device_id, source: row.source, signature: row.signature, ...(row.audit_json??{}) };
}
