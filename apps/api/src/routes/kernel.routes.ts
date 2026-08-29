import { Router, httpError, requirePermission, writeJson } from '../compat/router.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeDataset } from '@moonwitness/persistence';
import { isMizanInput } from '@moonwitness/contracts';
import { evaluateMizan } from '@moonwitness/mizan-engine';
import { engineCatalog } from '../engine-catalog.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export const kernelRouter = new Router();

kernelRouter.add('GET', '/api/v1/health', async (req, reply, _params, _body, _query, ctx) => {
  const base = { status: 'ok', release: '4.33.0' };
  if (process.env.NODE_ENV === 'production') {
    const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
    if (!authz.ok) {
      writeJson(reply, 200, base);
      return undefined;
    }
  }
  return {
    ...base,
    ...(ctx.backend.app.health() as Record<string, unknown>),
    needsSetup: ((ctx.auth as unknown as { _users?: Map<string, unknown> })._users?.size ?? 0) === 0,
    environment: process.env.MOONWITNESS_ENV ?? process.env.NODE_ENV ?? 'development',
    database: process.env.PGDATABASE ?? null,
    storageDriver: ctx.universeStore.persistence.store.driver,
  };
});

kernelRouter.add('GET', '/api/v1/ready', async (_req, _reply, _params, _body, _query, ctx) => {
  try {
    await ctx.backend.app.ready?.();
    return {
      status: 'ready',
      release: '4.33.0',
      storageDriver: ctx.universeStore.persistence.store.driver,
    };
  } catch {
    return httpError(503, 'SERVICE_NOT_READY');
  }
});

kernelRouter.add('GET', '/api/v1/features', async (_req, _reply, _params, _body, _query, ctx) => ctx.features.list());
kernelRouter.add('GET', '/api/v1/prophets', async () => runtimeDataset('data/prophets.json') ?? []);
kernelRouter.add('GET', '/api/v1/engine/catalog', async (req, _reply, _params, _body, _query, ctx) => {
  if (process.env.NODE_ENV === 'production') {
    const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
    if (!authz.ok) return authz.error;
  }
  return engineCatalog();
});

kernelRouter.add('POST', '/api/v1/mizan', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE');
  if (!authz.ok) return authz.error;
  if (!isMizanInput(body)) return httpError(400, 'INVALID_MIZAN_INPUT');
  try {
    return {
      ...evaluateMizan(body),
      meta: {
        engine: 'mizan',
        version: '4.33.0',
        endpoint: '/api/v1/mizan',
        actorId: authz.user.userId,
      },
    };
  } catch (error) {
    return httpError(500, 'MIZAN_EVALUATION_FAILED', error instanceof Error ? error.message : String(error));
  }
});

async function requireProductionAudit(req: Parameters<typeof requirePermission>[0], ctx: any) {
  if (process.env.NODE_ENV !== 'production') return null;
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  return authz.ok ? null : authz.error;
}

kernelRouter.add('GET', '/api/v1/kernel/graph', async (req, _reply, _params, _body, _query, ctx) => (await requireProductionAudit(req, ctx)) ?? ctx.backend.runtime.graph.snapshot());
kernelRouter.add('GET', '/api/v1/kernel/graph/integrity', async (req, _reply, _params, _body, _query, ctx) => (await requireProductionAudit(req, ctx)) ?? ctx.backend.runtime.graph.integrity());
kernelRouter.add('GET', '/api/v1/kernel/ledger', async (req, _reply, _params, _body, _query, ctx) => (await requireProductionAudit(req, ctx)) ?? ctx.backend.runtime.ledger.list());
kernelRouter.add('GET', '/api/v1/kernel/types', async (req, _reply, _params, _body, _query, ctx) => (await requireProductionAudit(req, ctx)) ?? ctx.backend.runtime.types.list());

kernelRouter.add('GET', '/api/v1/models', async (req, _reply, _params, _body, query, ctx) => (await requireProductionAudit(req, ctx)) ?? ctx.backend.models.list(Object.fromEntries(query.entries())));

kernelRouter.add('GET', '/api/v1/models/:typeId', async (req, _reply, params, _body, _query, ctx) => {
  const denied = await requireProductionAudit(req, ctx);
  if (denied) return denied;
  const model = ctx.backend.models.get(decodeURIComponent(params.typeId));
  return model ?? httpError(404, 'MODEL_NOT_FOUND');
});

kernelRouter.add('GET', '/api/v1/models/:typeId/page', async (req, _reply, params, _body, _query, ctx) => {
  const denied = await requireProductionAudit(req, ctx);
  if (denied) return denied;
  const model = ctx.backend.models.pageModel(decodeURIComponent(params.typeId));
  return model ?? httpError(404, 'MODEL_NOT_FOUND');
});
