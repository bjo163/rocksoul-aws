import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileProvider } from '../packages/persistence/src/file.js';
import { MemoryProvider } from '../packages/persistence/src/memory.js';
import { PostgresProvider, type PostgresClient, type PostgresPool } from '../packages/persistence/src/postgres.js';
import type { PersistenceStore } from '../packages/persistence/src/types.js';

const types = fs.readFileSync('packages/persistence/src/types.ts', 'utf8');
const factory = fs.readFileSync('packages/persistence/src/factory.ts', 'utf8');
const index = fs.readFileSync('packages/persistence/src/index.ts', 'utf8');

test('persistence public driver surface is limited to memory, file, and postgres', () => {
  assert.match(types, /'memory'\s*\|\s*'file'\s*\|\s*'postgres'/);
  assert.doesNotMatch(types, /'sqlite'/);
  assert.doesNotMatch(factory, /sqlite/);
  assert.doesNotMatch(index, /sqlite/);
});

test('persistence factory exposes a single createPersistence boundary', () => {
  assert.match(factory, /export function createPersistence/);
  assert.match(factory, /driver.*memory/);
  assert.match(factory, /driver.*file/);
  assert.match(factory, /driver.*postgres/);
});

async function assertPortableStore(store: PersistenceStore): Promise<void> {
  const entities = store.entityRepository();
  const entity = await entities.put({ id: 'ENTITY-1', type: 'CASE', payload: { title: 'Conformance' } });
  assert.equal(entity.version, 1);
  assert.equal((await entities.get('ENTITY-1'))?.payload.title, 'Conformance');
  assert.equal((await entities.list('CASE')).length, 1);

  await store.relationRepository().put({ id: 'REL-1', fromId: 'ENTITY-1', toId: 'ENTITY-2', type: 'RELATED_TO' });
  assert.equal((await store.relationRepository().listByEntity('ENTITY-1')).length, 1);

  const event = await store.eventStore().append({ eventId: 'EVENT-1', entityId: 'ENTITY-1', eventType: 'CREATED', payload: {} });
  assert.ok(event.eventHash);
  assert.equal((await store.eventStore().verifyChain()).valid, true);

  await store.evidenceRepository().put({ evidenceId: 'EVIDENCE-1', entityId: 'ENTITY-1', sourceType: 'TEST', payload: {} });
  assert.equal((await store.evidenceRepository().listByEntity('ENTITY-1')).length, 1);
  await store.projectionStore().upsert({ projectionId: 'PROJECTION-1', entityId: 'ENTITY-1', projectionType: 'CURRENT', payload: {} });
  assert.equal((await store.projectionStore().get('ENTITY-1', 'CURRENT'))?.projectionId, 'PROJECTION-1');

  await store.traceRepository().put({ requestId: 'REQUEST-1', correlationId: 'CORRELATION-1', route: '/contract', startedAt: new Date().toISOString() });
  assert.equal((await store.traceRepository().list(1)).at(-1)?.requestId, 'REQUEST-1');
  await store.jobRepository().put({ id: 'JOB-1', type: 'TEST', status: 'QUEUED', payload_json: '{}', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  assert.equal((await store.jobRepository().get('JOB-1'))?.status, 'QUEUED');
}

test('memory and file adapters implement the portable persistence contract', async () => {
  const memory = new MemoryProvider();
  await assertPortableStore(memory);
  const directory = await mkdtemp(join(tmpdir(), 'cosmic-persistence-conformance-'));
  const file = new FileProvider(directory);
  try {
    await assertPortableStore(file);
  } finally {
    await file.close();
    await rm(directory, { recursive: true, force: true });
  }
});

class MockPostgresPool implements PostgresPool {
  readonly queries: Array<{ sql: string; params?: unknown[] }> = [];
  released = 0;
  ended = false;
  private readonly client: PostgresClient = { query: (sql, params) => this.query(sql, params), release: () => { this.released += 1; } };

  async connect(): Promise<PostgresClient> { return this.client; }
  async end(): Promise<void> { this.ended = true; }
  async query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount?: number }> {
    this.queries.push({ sql, params });
    if (sql.includes("to_regclass('public.schema_migrations')")) return { rows: [{ name: 'schema_migrations' }] };
    if (sql.includes('SELECT version FROM schema_migrations')) return { rows: [{ version: 999 }] };
    if (sql.includes('SELECT * FROM entities WHERE type')) return { rows: [{ id: 'ENTITY-1', type: 'CASE', version: 2, payload_json: { title: 'Mocked' }, updated_at: '2026-01-01T00:00:00.000Z', audit_json: {} }] };
    if (sql.includes('SELECT * FROM system_traces')) return { rows: [{ request_id: 'REQUEST-1', correlation_id: 'CORRELATION-1', route: '/contract', started_at: '2026-01-01T00:00:00.000Z' }] };
    return { rows: [], rowCount: sql.startsWith('UPDATE system_jobs') ? 1 : undefined };
  }
}

test('Postgres adapter uses injected pool for migration, transactions, mapping, and cleanup', async () => {
  const pool = new MockPostgresPool();
  const store = new PostgresProvider({}, pool);
  await store.ready();
  const records = await store.entityRepository().list('CASE');
  assert.deepEqual(records[0]?.payload, { title: 'Mocked' });
  assert.equal((await store.traceRepository().list(1))[0]?.requestId, 'REQUEST-1');
  await store.batch(async () => undefined);
  await store.close();
  assert.ok(pool.queries.some(({ sql }) => sql === 'BEGIN'));
  assert.ok(pool.queries.some(({ sql }) => sql === 'COMMIT'));
  assert.ok(pool.queries.some(({ sql, params }) => sql.includes('WHERE type = $1') && params?.[0] === 'CASE'));
  assert.ok(pool.released >= 2);
  assert.equal(pool.ended, true);
});
