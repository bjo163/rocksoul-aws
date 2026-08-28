import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFastifyRuntime } from '../src/fastify-runtime.js';
import { bootstrapFastify } from '../src/fastify-bootstrap.js';

function createMockContext() {
  return {
    backend: {
      app: { health: () => ({ db: 'ok' }), ready: async () => { }, graph: () => null, createEntity: async (e: any) => e, updateEntity: async (_id: string, e: any) => e, deleteEntity: async () => ({}), createRelation: async (e: any) => e, recordEvent: async (e: any) => e, resolveRule: async (_r: any) => ({}) },
      runtime: { graph: { snapshot: () => ({}), integrity: () => ({}), getEntity: () => null, listEntities: () => [] }, ledger: { list: () => [] }, types: { list: () => [] } },
      models: { list: () => [], get: () => null, pageModel: () => null, define: (e: any) => e }
    },
    universeStore: {
      persistence: { store: { driver: 'file' }, entities: () => ({ get: async () => null, saveEntity: async (e: any) => e, list: () => [] }), asActor: () => ({ saveEntity: async (e: any) => e, appendEvent: async (e: any) => e, saveEvidence: async (e: any) => e }) },
      getCase: async () => null, listCaseEvidence: async () => [], listCaseEvents: async () => [], auditHistory: async () => [], verifyAudit: async () => ({}), verifyLedger: async () => ({})
    },
    auth: { createUser: async () => ({ userId: 'u1', username: 'smoke' }), login: async () => ({ accessToken: 't1', refreshToken: 'rt1', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(), user: { userId: 'u1' } }), authenticate: async () => null, _users: new Map() },
    features: { list: () => [] },
    idempotency: { execute: async (_key: string, _hash: string, work: () => Promise<any>) => work() },
    jobs: { get: async () => null, processAvailable: async () => [] },
    semanticRegistry: { snapshot: () => ({}) },
    semanticProvider: {},
    witness: {
      dag: { verify: () => ({ nodes: 0, heads: 0, root: null, valid: true }), list: () => [], get: () => null, getById: () => null },
      keyStore: { activeRecord: () => null, list: () => [], rotate: async () => ({}), revoke: async () => ({}), create: async () => ({}) },
      checkpoints: { list: () => [] },
      transport: { exportChunks: () => [], importChunks: async () => ({}) },
      store: null,
      keyPasswordSource: 'dev',
      metrics: { record: () => {}, snapshot: () => ({}) },
      diagnostics: async () => ({}),
      createBackup: async () => ({ manifest: {} }),
      backups: { list: () => [], verify: async () => ({}) },
      persistKeys: async () => {},
      refreshTransportIdentity: async () => null,
      appendMizan: async () => ({ node: null }),
      commitMizan: async () => ({ node: { nodeId: '', hash: '', root: '' }, checkpoint: null, root: '' }),
      commit: async () => ({ node: { nodeId: '', hash: '', root: '' }, checkpoint: null, root: '' }),
      createCheckpoint: async () => ({ checkpointId: '' }),
      dataDir: '.data'
    },
    observability: { recent: () => [], on: () => {}, off: () => {} }
  };
}

test('Fastify smoke: health with bootstrap', async () => {
  const app = await buildFastifyRuntime();
  await bootstrapFastify({ app, context: createMockContext() });

  const health = await app.inject({ method: 'GET', url: '/health' });
  console.log('TEST1 HEALTH STATUS:', health.statusCode);
  assert.strictEqual(health.statusCode, 200);

  await app.close();
});

test('Fastify smoke: error handling', async () => {
  const app = await buildFastifyRuntime();

  const badMethod = await app.inject({ method: 'DELETE', url: '/health' });
  console.log('TEST2 DELETE STATUS:', badMethod.statusCode);
  assert.strictEqual(badMethod.statusCode, 415);

  await app.close();
});

test('Fastify smoke: graceful shutdown', async () => {
  const app = await buildFastifyRuntime({ logger: false });
  await app.ready();
  console.log('TEST3 SERVER:', !!app.server);
  assert.ok(app.server);
  await app.close();
});
