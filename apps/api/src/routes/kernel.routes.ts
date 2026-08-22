import { Router, httpError } from '../router.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeDataset } from '../../../../src/persistence/runtime-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export const kernelRouter = new Router();

kernelRouter.add('GET', '/api/v1/health', async (_req, _reply, _params, _body, _query, ctx) => ({
  ...(ctx.backend.app.health() as Record<string, unknown>),
  environment: process.env.MOONWITNESS_ENV ?? process.env.NODE_ENV ?? 'development',
  database: process.env.PGDATABASE ?? null,
  storageDriver: ctx.universeStore.persistence.store.driver,
  release: '4.32.0',
}));

kernelRouter.add('GET', '/api/v1/features', async (_req, _reply, _params, _body, _query, ctx) => ctx.features.list());

kernelRouter.add('GET', '/api/v1/prophets', async () => runtimeDataset('data/prophets.json') ?? []);


kernelRouter.add('GET', '/api/v1/kernel/graph', async (_req, _reply, _params, _body, _query, ctx) => ctx.backend.runtime.graph.snapshot());
kernelRouter.add('GET', '/api/v1/kernel/graph/integrity', async (_req, _reply, _params, _body, _query, ctx) => ctx.backend.runtime.graph.integrity());
kernelRouter.add('GET', '/api/v1/kernel/ledger', async (_req, _reply, _params, _body, _query, ctx) => ctx.backend.runtime.ledger.list());
kernelRouter.add('GET', '/api/v1/kernel/types', async (_req, _reply, _params, _body, _query, ctx) => ctx.backend.runtime.types.list());

kernelRouter.add('GET', '/api/v1/models', async (_req, _reply, _params, _body, query, ctx) => ctx.backend.models.list(Object.fromEntries(query.entries())));

kernelRouter.add('GET', '/api/v1/models/:typeId', async (_req, _reply, params, _body, _query, ctx) => {
  const model = ctx.backend.models.get(decodeURIComponent(params.typeId));
  return model ?? httpError(404, 'MODEL_NOT_FOUND');
});

kernelRouter.add('GET', '/api/v1/models/:typeId/page', async (_req, _reply, params, _body, _query, ctx) => {
  const model = ctx.backend.models.pageModel(decodeURIComponent(params.typeId));
  return model ?? httpError(404, 'MODEL_NOT_FOUND');
});
