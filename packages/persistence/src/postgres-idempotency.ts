import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import type { IdempotencyRecord } from './idempotency.js';

interface PgResult { rows: unknown[] }
interface PgClient { query(sql: string, params?: unknown[]): Promise<PgResult>; release(): void }
interface PgPool { connect(): Promise<PgClient>; end(): Promise<void> }
const require = createRequire(import.meta.url);

export class PostgresIdempotencyStore {
  private readonly pool: PgPool;
  constructor(options?: Record<string, unknown>) { this.pool = new (require('pg').Pool)(options); }

  static hash(input: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(input ?? null)).digest('hex');
  }

  async get(key: string): Promise<IdempotencyRecord | null> {
    const result = await this.pool.connect();
    try {
      const query = await result.query('SELECT * FROM idempotency_records WHERE key=$1', [key]);
      const row = query.rows[0] as Record<string, unknown> | undefined;
      return row ? { key: String(row.key), requestHash: String(row.request_hash), statusCode: Number(row.status_code), body: row.body_json, createdAt: new Date(String(row.created_at)).toISOString() } : null;
    } finally { result.release(); }
  }

  async execute<T>(key: string | null, requestHash: string, work: () => Promise<{ statusCode: number; body: T }>): Promise<{ statusCode: number; body: T }> {
    if (!key) return work();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
      const query = await client.query('SELECT * FROM idempotency_records WHERE key=$1', [key]);
      const row = query.rows[0] as Record<string, unknown> | undefined;
      if (row) {
        const record: IdempotencyRecord = { key: String(row.key), requestHash: String(row.request_hash), statusCode: Number(row.status_code), body: row.body_json, createdAt: new Date(String(row.created_at)).toISOString() };
        if (record.requestHash !== requestHash) throw Object.assign(new Error('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD'), { code: 'IDEMPOTENCY_CONFLICT', statusCode: 409 });
        await client.query('COMMIT');
        return { statusCode: record.statusCode, body: record.body as T };
      }
      const result = await work();
      await client.query('INSERT INTO idempotency_records(key,request_hash,status_code,body_json,created_at) VALUES($1,$2,$3,$4,$5)', [key, requestHash, result.statusCode, JSON.stringify(result.body), new Date().toISOString()]);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
      throw error;
    } finally { client.release(); }
  }

  async close(): Promise<void> { await this.pool.end(); }
}
