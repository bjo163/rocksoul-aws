import { createRequire } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PersistenceError } from './ports.js';
import { MIGRATIONS } from './schema.js';
import { hashEvent } from './hash.js';
import { makeAuditRecord, changedFields, hashAudit } from './audit.js';
import type { PersistenceStore, EntityRecord, RelationRecord, EventRecord, ProjectionRecord, AuditRecord, EvidenceRecord, SystemTraceRecord, SystemJobRecord } from './types.js';

export interface PgResult { rows: any[]; rowCount?: number }
export interface PostgresClient { query(sql: string, params?: unknown[]): Promise<PgResult>; release(): void }
export interface PostgresPool { query(sql: string, params?: unknown[]): Promise<PgResult>; connect(): Promise<PostgresClient>; end(): Promise<void> }

const require = createRequire(import.meta.url);

function requirePg(): { Pool: new (config?: Record<string, unknown>) => PostgresPool } {
  try { return require('pg') as { Pool: new (config?: Record<string, unknown>) => PostgresPool }; }
  catch (cause) { throw new PersistenceError('PostgreSQL adapter requires optional dependency "pg". Install it with: npm install pg', 'POSTGRES_DRIVER_MISSING', cause); }
}

export class PostgresProvider implements PersistenceStore {
  readonly driver = 'postgres' as const;
  private readonly pool: PostgresPool;
  private readonly readyPromise: Promise<void>;
  private inTransaction = false;
  private readonly txStorage = new AsyncLocalStorage<PostgresClient>();

  async begin(): Promise<PersistenceStore> {
    throw new PersistenceError('Use store.batch() for PostgreSQL transactions; begin() cannot safely expose a connection across async scopes.', 'POSTGRES_BEGIN_UNSUPPORTED');
  }

  private query(sql: string, params?: unknown[]): Promise<PgResult> {
    const client = this.txStorage.getStore();
    return client ? client.query(sql, params) : this.pool.query(sql, params);
  }

  constructor(config: Record<string, unknown> = {}, pool?: PostgresPool) {
    this.pool = pool ?? new (requirePg().Pool)(config);
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
  async close(): Promise<void> {
    try {
      await this.readyPromise;
    } catch {
      // Initialization failures are surfaced by ready(); close() remains cleanup-safe.
    }
    await this.pool.end();
  }

  entityRepository() {
    return {
      put: async (entity: EntityRecord) => {
        const execute = async () => {
          const now = new Date().toISOString();
          const current=await this.query('SELECT * FROM entities WHERE id=$1 FOR UPDATE',[entity.id]); const existing=current.rows[0];
          if(entity.expectedVersion!==undefined&&(existing?.version??0)!==entity.expectedVersion)throw Object.assign(new Error('ENTITY_VERSION_CONFLICT'),{code:'ENTITY_VERSION_CONFLICT',statusCode:409,currentVersion:existing?.version??0});
          const {expectedVersion:_expectedVersion,...candidate}=entity; const previousAudit=existing?.audit_json??{}; const saved = { ...candidate, version: candidate.version ?? ((existing?.version??0)+1), createdAt: candidate.createdAt ?? previousAudit.createdAt ?? now, createdBy: candidate.createdBy ?? previousAudit.createdBy ?? 'SYSTEM-001', updatedAt: now, updatedBy: candidate.updatedBy ?? 'SYSTEM-001' };
          await this.query(`INSERT INTO entities(id,type,version,payload_json,updated_at,audit_json) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET type=EXCLUDED.type,version=EXCLUDED.version,payload_json=EXCLUDED.payload_json,updated_at=EXCLUDED.updated_at,audit_json=EXCLUDED.audit_json`, [saved.id, saved.type, saved.version, JSON.stringify(saved.payload), now, JSON.stringify({createdAt:saved.createdAt,createdBy:saved.createdBy,updatedAt:saved.updatedAt,updatedBy:saved.updatedBy,version:saved.version})]);
          await writeAudit({ query: (sql: string, params?: unknown[]) => this.query(sql, params) },{operation:existing?'UPDATE':'CREATE',modelType:saved.type,recordId:saved.id,actorId:saved.updatedBy??saved.createdBy??'SYSTEM-001',timestamp:now,changedFields:changedFields(existing?existing.payload_json:null,saved.payload),before:existing?{id:existing.id,type:existing.type,version:existing.version,payload:existing.payload_json,audit:existing.audit_json}:null,after:saved as any});
          return saved;
        };
        return this.txStorage.getStore() ? await execute() : await this.batch(execute);
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
      put: async (evidence: import('./types.js').EvidenceRecord) => { const execute=async()=>{ const saved={...evidence,version:evidence.version??1,createdAt:evidence.createdAt??new Date().toISOString(),createdBy:evidence.createdBy??'SYSTEM-001',updatedAt:new Date().toISOString(),updatedBy:evidence.updatedBy??'SYSTEM-001'}; await this.query('INSERT INTO evidence(evidence_id,entity_id,source_type,reference,status,confidence,payload_json,created_at,audit_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(evidence_id) DO UPDATE SET entity_id=EXCLUDED.entity_id,source_type=EXCLUDED.source_type,reference=EXCLUDED.reference,status=EXCLUDED.status,confidence=EXCLUDED.confidence,payload_json=EXCLUDED.payload_json,created_at=EXCLUDED.created_at',[saved.evidenceId,saved.entityId,saved.sourceType,saved.reference??null,saved.status??'UNKNOWN',saved.confidence??null,JSON.stringify(saved.payload??{}),saved.createdAt,JSON.stringify({createdAt:saved.createdAt,createdBy:saved.createdBy,updatedAt:saved.updatedAt,updatedBy:saved.updatedBy,version:saved.version})]); await writeAudit({ query: (sql: string, params?: unknown[]) => this.query(sql, params) },{operation:'CREATE',modelType:'EVIDENCE',recordId:saved.evidenceId,actorId:saved.updatedBy??'SYSTEM-001',timestamp:saved.updatedAt??new Date().toISOString(),changedFields:Object.keys(saved),before:null,after:saved as any}); return saved; }; return this.txStorage.getStore()?await execute():await this.batch(execute); },
      get: async (id:string) => { const r=await this.query('SELECT * FROM evidence WHERE evidence_id=$1',[id]); const row=r.rows[0]; return row?{evidenceId:row.evidence_id,entityId:row.entity_id,sourceType:row.source_type,reference:row.reference,status:row.status,confidence:row.confidence,payload:row.payload_json,createdAt:row.created_at,...(row.audit_json??{})}:null; },
      listByEntity: async (entityId:string) => { const r=await this.query('SELECT * FROM evidence WHERE entity_id=$1 ORDER BY created_at',[entityId]); return r.rows.map(row=>({evidenceId:row.evidence_id,entityId:row.entity_id,sourceType:row.source_type,reference:row.reference,status:row.status,confidence:row.confidence,payload:row.payload_json,createdAt:row.created_at,...(row.audit_json??{})})); },
    };
  }

  projectionStore() {
    return {
      upsert: async (projection: ProjectionRecord) => { const execute=async()=>{ const now = new Date().toISOString(); const saved = { ...projection, version: projection.version ?? 1, createdAt: projection.createdAt ?? now, createdBy: projection.createdBy ?? 'SYSTEM-001', updatedAt: now, updatedBy: projection.updatedBy ?? 'SYSTEM-001' }; await this.query(`INSERT INTO projections(projection_id,entity_id,projection_type,version,payload_json,updated_at,audit_json) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(projection_id) DO UPDATE SET version=EXCLUDED.version,payload_json=EXCLUDED.payload_json,updated_at=EXCLUDED.updated_at,audit_json=EXCLUDED.audit_json`, [saved.projectionId, saved.entityId, saved.projectionType, saved.version, JSON.stringify(saved.payload ?? {}), now, JSON.stringify({createdAt:saved.createdAt,createdBy:saved.createdBy,updatedAt:saved.updatedAt,updatedBy:saved.updatedBy,version:saved.version})]); await writeAudit({ query: (sql: string, params?: unknown[]) => this.query(sql, params) },{operation:'CREATE',modelType:'PROJECTION',recordId:saved.projectionId,actorId:saved.updatedBy??'SYSTEM-001',timestamp:now,changedFields:Object.keys(saved),before:null,after:saved as any}); return saved; }; return this.txStorage.getStore()?await execute():await this.batch(execute); },
      get: async (entityId: string, projectionType: string) => { const result = await this.query('SELECT * FROM projections WHERE entity_id = $1 AND projection_type = $2', [entityId, projectionType]); return result.rows.length ? { projectionId: result.rows[0].projection_id, entityId: result.rows[0].entity_id, projectionType: result.rows[0].projection_type, version: result.rows[0].version, payload: result.rows[0].payload_json, updatedAt: result.rows[0].updated_at, ...(result.rows[0].audit_json ?? {}) } as ProjectionRecord : null; },
    };
  }

  auditStore() {
    const store = this;
    return {
      append: async (record: AuditRecord) => {
        await store.query('INSERT INTO audit_ledger(audit_id,operation,model_type,record_id,actor_id,timestamp,changed_fields,before_json,after_json,correlation_id,reason,previous_hash,hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [record.auditId,record.operation,record.modelType,record.recordId,record.actorId,record.timestamp,record.changedFields,JSON.stringify(record.before??null),JSON.stringify(record.after??null),record.correlationId??null,record.reason??null,record.previousHash??null,record.hash??null]); return record; },
      listByRecord: async (recordId:string) => { const result=await store.query('SELECT * FROM audit_ledger WHERE record_id=$1 ORDER BY timestamp,audit_id',[recordId]); return result.rows.map(normalizeAudit); },
      listAll: async () => { const result=await store.query('SELECT * FROM audit_ledger ORDER BY timestamp,audit_id'); return result.rows.map(normalizeAudit); },
      verify: async () => {
        const result = await store.query('SELECT * FROM audit_ledger ORDER BY chain_position ASC');
        let previous = '';
        for (const row of result.rows) {
          const record = normalizeAudit(row);
          if (row.previous_hash !== previous) {
            console.error('AUDIT CHAIN MISMATCH:', { expectedPrev: previous, actualPrev: row.previous_hash, record });
            return { valid: false, count: result.rows.length, head: previous || null };
          }
          const computed = hashAudit(record, previous);
          if (computed !== row.hash) {
            console.error('AUDIT HASH MISMATCH:', { computed, actual: row.hash, record });
            return { valid: false, count: result.rows.length, head: previous || null };
          }
          previous = row.hash;
        }
        return { valid: true, count: result.rows.length, head: previous || null };
      },
    };
  }

  traceRepository() {
    return {
      put: async (trace: SystemTraceRecord) => { await this.query('INSERT INTO system_traces(request_id,correlation_id,route,status_code,duration_ms,error,started_at,completed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [trace.requestId,trace.correlationId,trace.route,trace.statusCode??null,trace.durationMs??null,trace.error??null,trace.startedAt,trace.completedAt??null]); },
      list: async (limit = 100) => { const result = await this.query('SELECT * FROM system_traces ORDER BY started_at DESC LIMIT $1',[limit]); return result.rows.map((row)=>({requestId:row.request_id,correlationId:row.correlation_id,route:row.route,statusCode:row.status_code,durationMs:row.duration_ms,error:row.error,startedAt:row.started_at,completedAt:row.completed_at})); },
    };
  }

  jobRepository() {
    const jobFromRow = (row: Record<string, unknown>): SystemJobRecord => ({id:String(row.id),type:String(row.type),status:row.status as SystemJobRecord['status'],payload_json:typeof row.payload_json === 'string' ? row.payload_json : JSON.stringify(row.payload_json),result_json:row.result_json == null ? undefined : (typeof row.result_json === 'string' ? row.result_json : JSON.stringify(row.result_json)),error_message:typeof row.error_message === 'string' ? row.error_message : undefined,created_at:String(row.created_at),updated_at:String(row.updated_at),attempt_count:typeof row.attempt_count === 'number' ? row.attempt_count : 0,max_attempts:typeof row.max_attempts === 'number' ? row.max_attempts : 3,available_at:typeof row.available_at === 'string' ? row.available_at : String(row.created_at),lease_owner:typeof row.lease_owner === 'string' ? row.lease_owner : undefined,lease_expires_at:typeof row.lease_expires_at === 'string' ? row.lease_expires_at : undefined,idempotency_key:typeof row.idempotency_key === 'string' ? row.idempotency_key : undefined});
    return {
      put: async (job: SystemJobRecord) => { await this.query('INSERT INTO system_jobs(id,type,status,payload_json,result_json,error_message,created_at,updated_at,attempt_count,max_attempts,available_at,lease_owner,lease_expires_at,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,result_json=EXCLUDED.result_json,error_message=EXCLUDED.error_message,updated_at=EXCLUDED.updated_at,attempt_count=EXCLUDED.attempt_count,max_attempts=EXCLUDED.max_attempts,available_at=EXCLUDED.available_at,lease_owner=EXCLUDED.lease_owner,lease_expires_at=EXCLUDED.lease_expires_at',[job.id,job.type,job.status,job.payload_json,job.result_json??null,job.error_message??null,job.created_at,job.updated_at,job.attempt_count??0,job.max_attempts??3,job.available_at??job.created_at,job.lease_owner??null,job.lease_expires_at??null,job.idempotency_key??null]); },
      get: async (id:string) => { const r=await this.query('SELECT * FROM system_jobs WHERE id=$1',[id]); return r.rows[0] ? jobFromRow(r.rows[0]) : null; },
      list: async (status?: string) => { const r=status?await this.query('SELECT * FROM system_jobs WHERE status=$1 ORDER BY created_at',[status]):await this.query('SELECT * FROM system_jobs ORDER BY created_at'); return r.rows.map(jobFromRow); },
      processAvailable: async (maxJobs:number, processor:(job:SystemJobRecord)=>Promise<SystemJobRecord>) => { const jobs=await this.query('SELECT * FROM system_jobs WHERE status=$1 ORDER BY created_at LIMIT $2',['QUEUED',maxJobs]); const out:SystemJobRecord[]=[]; for(const row of jobs.rows){out.push(await processor(jobFromRow(row)));} return out; },
      claimAvailable: async (maxJobs:number, owner:string, leaseExpiresAt:string, now:string) => { const r = await this.query(`WITH candidates AS (SELECT id FROM system_jobs WHERE (status='QUEUED' AND available_at <= $1) OR (status='RUNNING' AND lease_expires_at <= $1) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT $2) UPDATE system_jobs j SET status='RUNNING', lease_owner=$3, lease_expires_at=$4, updated_at=$1 FROM candidates c WHERE j.id=c.id RETURNING j.*`,[now,maxJobs,owner,leaseExpiresAt]); return r.rows.map(jobFromRow); },
      resolveLease: async (id:string, owner:string, job:SystemJobRecord) => { const r = await this.query('UPDATE system_jobs SET status=$1,result_json=$2,error_message=$3,updated_at=$4,attempt_count=$5,max_attempts=$6,available_at=$7,lease_owner=$8,lease_expires_at=$9 WHERE id=$10 AND status=$11 AND lease_owner=$12',[job.status,job.result_json??null,job.error_message??null,job.updated_at,job.attempt_count??0,job.max_attempts??3,job.available_at??job.updated_at,job.lease_owner??null,job.lease_expires_at??null,id,'RUNNING',owner]); return (r as { rowCount?: number }).rowCount === 1; },
    };
  }
}

async function writeAudit(store: { query: (sql: string, params?: unknown[]) => Promise<PgResult> }, record: Omit<AuditRecord, 'auditId'|'hash'|'previousHash'>): Promise<void> {
  // Hash creation and insertion must share one serialized transaction across all provider instances.
  await store.query('SELECT pg_advisory_xact_lock($1)', [837462902]);
  const previous = await store.query('SELECT hash FROM audit_ledger ORDER BY chain_position DESC LIMIT 1');
  const previousHash = previous.rows[0]?.hash ?? '';
  const audit = makeAuditRecord(record, previousHash);
  await store.query('INSERT INTO audit_ledger(audit_id,operation,model_type,record_id,actor_id,timestamp,changed_fields,before_json,after_json,correlation_id,reason,previous_hash,hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [audit.auditId,audit.operation,audit.modelType,audit.recordId,audit.actorId,audit.timestamp,audit.changedFields,JSON.stringify(audit.before??null),JSON.stringify(audit.after??null),audit.correlationId??null,audit.reason??null,audit.previousHash??null,audit.hash??null]);
}

function normalizeEvent(row: Record<string, unknown>): EventRecord {
  const payload = row.payload_json && typeof row.payload_json === 'object' && !Array.isArray(row.payload_json)
    ? row.payload_json as Record<string, unknown>
    : {};
  const auditJson = row.audit_json && typeof row.audit_json === 'object' && !Array.isArray(row.audit_json)
    ? row.audit_json as Record<string, unknown>
    : {};
  return {
    eventId: String(row.event_id ?? ''),
    entityId: String(row.entity_id ?? ''),
    eventType: String(row.event_type ?? ''),
    payload,
    occurredAt: normalizePostgresTimestamp(row.occurred_at),
    recordedAt: normalizePostgresTimestamp(row.recorded_at),
    previousHash: String(row.previous_hash ?? ''),
    eventHash: String(row.event_hash ?? ''),
    actorId: typeof row.actor_id === 'string' ? row.actor_id : row.actor_id == null ? null : String(row.actor_id),
    deviceId: typeof row.device_id === 'string' ? row.device_id : row.device_id == null ? null : String(row.device_id),
    source: typeof row.source === 'string' ? row.source : row.source == null ? null : String(row.source),
    signature: typeof row.signature === 'string' ? row.signature : row.signature == null ? null : String(row.signature),
    ...auditJson,
  };
}

function normalizePostgresTimestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? '');
}
