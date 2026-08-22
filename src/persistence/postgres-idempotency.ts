import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import type { IdempotencyRecord } from './idempotency.js';

interface PgResult { rows: any[] }
interface PgClient { query(sql:string, params?:unknown[]):Promise<PgResult>; release():void }
interface PgPool { query(sql:string, params?:unknown[]):Promise<PgResult>; connect():Promise<PgClient>; end():Promise<void> }
const require = createRequire(import.meta.url);

export class PostgresIdempotencyStore {
  private readonly pool: PgPool;
  constructor(){ this.pool = new (require('pg').Pool)(); }

  static hash(input: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(input ?? null)).digest('hex');
  }

  async get(key: string): Promise<IdempotencyRecord | null> {
    const r = await this.pool.query('SELECT * FROM idempotency_records WHERE key=$1', [key]);
    const x = r.rows[0];
    return x ? {
      key: x.key,
      requestHash: x.request_hash,
      statusCode: x.status_code,
      body: x.body_json,
      createdAt: new Date(x.created_at).toISOString()
    } as IdempotencyRecord : null;
  }

  /**
   * Serialize requests sharing the same idempotency key using a PostgreSQL
   * transaction-scoped advisory lock. This prevents the classic race where
   * two identical requests both observe a missing record and execute work.
   */
  async execute<T>(key: string | null, requestHash: string, work: () => Promise<{statusCode:number;body:T}>) {
    if (!key) return work();

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);

      const existingResult = await client.query('SELECT * FROM idempotency_records WHERE key=$1', [key]);
      const existing = existingResult.rows[0];
      if (existing) {
        const record = {
          key: existing.key,
          requestHash: existing.request_hash,
          statusCode: existing.status_code,
          body: existing.body_json,
          createdAt: new Date(existing.created_at).toISOString()
        } as IdempotencyRecord;
        if (record.requestHash !== requestHash) {
          await client.query('ROLLBACK');
          throw Object.assign(new Error('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD'), { code:'IDEMPOTENCY_CONFLICT', statusCode:409 });
        }
        await client.query('COMMIT');
        return { statusCode: record.statusCode, body: record.body as T };
      }

      const result = await work();
      await client.query(
        'INSERT INTO idempotency_records(key,request_hash,status_code,body_json,created_at) VALUES($1,$2,$3,$4,$5)',
        [key, requestHash, result.statusCode, JSON.stringify(result.body), new Date().toISOString()]
      );
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
      throw error;
    } finally {
      client.release();
    }
  }

  async close(){ await this.pool.end(); }
}
