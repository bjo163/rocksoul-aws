import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFastifyRuntime } from '../src/fastify-runtime.js';
import { bootstrapFastify } from '../src/fastify-bootstrap.js';
import { Router } from '../src/router.js';

type MockRecord = Record<string, unknown>;

function createMockContext() {
  return {
    backend: {
      app: { health: () => ({ db: 'ok' }), ready: async () => { }, graph: () => null, createEntity: async (e: MockRecord) => e, updateEntity: async (_id: string, e: MockRecord) => e, deleteEntity: async () => ({}), createRelation: async (e: MockRecord) => e, recordEvent: async (e: MockRecord) => e, resolveRule: async (_r: MockRecord) => ({}) },
      runtime: { graph: { snapshot: () => ({}), integrity: () => ({}), getEntity: () => null, listEntities: () => [] }, ledger: { list: () => [] }, types: { list: () => [] } },
      models: { list: () => [], get: () => null, pageModel: () => null, define: (e: MockRecord) => e }
    },
    universeStore: {
      persistence: { store: { driver: 'file' }, entities: () => ({ get: async () => null, saveEntity: async (e: MockRecord) => e, list: () => [] }), asActor: () => ({ saveEntity: async (e: MockRecord) => e, appendEvent: async (e: MockRecord) => e, saveEvidence: async (e: MockRecord) => e }) },
      getCase: async () => null, listCaseEvidence: async () => [], listCaseEvents: async () => [], auditHistory: async () => [], verifyAudit: async () => ({}), verifyLedger: async () => ({})
    },
    auth: { createUser: async () => ({ userId: 'u1', username: 'smoke' }), login: async () => ({ accessToken: 't1', refreshToken: 'rt1', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(), user: { userId: 'u1' } }), authenticate: async () => null, _users: new Map() },
    features: { list: () => [] },
    idempotency: { execute: async (_key: string, _hash: string, work: () => Promise<{ statusCode: number; body: unknown }>) => work() },
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
  const context = createMockContext();
  await bootstrapFastify({ app, context });

  const health = await app.inject({ method: 'GET', url: '/health' });
  console.log('TEST1 HEALTH STATUS:', health.statusCode);
  assert.strictEqual(health.statusCode, 200);

  await app.close();
});

test('Fastify exposes canonical dependency ports to plugins', async () => {
  const app = await buildFastifyRuntime();
  const context = createMockContext();
  await bootstrapFastify({ app, context });

  assert.equal(app.persistence, context.universeStore);
  assert.equal(app.auth, context.auth);
  assert.equal(app.jobs, context.jobs);
  assert.equal(app.witness, context.witness);
  assert.equal(app.cosmic.persistence, context.universeStore);
  assert.equal(app.cosmic.auth, context.auth);
  assert.equal(app.cosmic.jobs, context.jobs);
  assert.equal(app.cosmic.witness, context.witness);
  assert.equal(typeof app.orchestrator.runAnalysisWorkflow, 'function');

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

test('Fastify registers canonical Router routes with native response parity', async () => {
  const app = await buildFastifyRuntime({ telemetry: false });
  const router = new Router();
  router.add('GET', '/api/v1/parity/:id', async (_request, _response, params) => ({
    id: params.id,
    status: 'ok',
  }));
  router.add('POST', '/api/v1/parity', async () => ({ statusCode: 201, body: { created: true } }));
  await bootstrapFastify({ app, context: createMockContext(), router });
  console.log(app.printRoutes());

  const get = await app.inject({ method: 'GET', url: '/api/v1/parity/alpha' });
  assert.equal(get.statusCode, 200);
  assert.deepEqual(get.json(), { id: 'alpha', status: 'ok', request_id: get.headers['x-request-id'] });

  const post = await app.inject({ method: 'POST', url: '/api/v1/parity', headers: { 'content-type': 'application/json' }, payload: '{}' });
  assert.equal(post.statusCode, 201);
  assert.deepEqual(post.json(), { created: true });

  await app.close();
});
