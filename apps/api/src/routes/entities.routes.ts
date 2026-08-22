import { Router, asRecord, httpError } from '../router.js';

export const entitiesRouter = new Router();

entitiesRouter.add('GET', '/api/v1/entities', async (_req, _reply, _params, _body, query, ctx) => {
  const limit = Math.max(1, Math.min(250, Number(query.get('limit')) || 50));
  const offset = Math.max(0, Number(query.get('offset')) || 0);
  const results = ctx.backend.runtime.graph.listEntities({
    type: query.get('type'), state: query.get('state'), q: query.get('q'),
  });
  return results.slice(offset, offset + limit);
});

entitiesRouter.add('GET', '/api/v1/entities/:id', async (_req, _reply, params, _body, _query, ctx) => 
  ctx.backend.runtime.graph.getEntity(params.id) ?? httpError(404, 'ENTITY_NOT_FOUND')
);

entitiesRouter.add('GET', '/api/v1/entities/:id/graph', async (_req, _reply, params, _body, _query, ctx) => 
  ctx.backend.app.graph(params.id) ?? httpError(404, 'GRAPH_NOT_FOUND')
);

entitiesRouter.add('POST', '/api/v1/entities', async (_req, _reply, _params, body, _query, ctx) => 
  ({ statusCode: 201, body: await ctx.backend.app.createEntity(asRecord(body)) })
);

entitiesRouter.add('PUT', '/api/v1/entities/:id', async (_req, _reply, params, body, _query, ctx) => 
  await ctx.backend.app.updateEntity(params.id, asRecord(body))
);

entitiesRouter.add('DELETE', '/api/v1/entities/:id', async (_req, _reply, params, _body, _query, ctx) => 
  await ctx.backend.app.deleteEntity(params.id)
);

entitiesRouter.add('POST', '/api/v1/relations', async (_req, _reply, _params, body, _query, ctx) => 
  ({ statusCode: 201, body: await ctx.backend.app.createRelation(asRecord(body)) })
);

entitiesRouter.add('POST', '/api/v1/events', async (_req, _reply, _params, body, _query, ctx) => 
  ({ statusCode: 201, body: await ctx.backend.app.recordEvent(asRecord(body)) })
);

entitiesRouter.add('POST', '/api/v1/types', async (_req, _reply, _params, body, _query, ctx) => 
  ({ statusCode: 201, body: ctx.backend.models.define(asRecord(body)) })
);

entitiesRouter.add('POST', '/api/v1/rules/resolve', async (_req, _reply, _params, body, _query, ctx) => 
  ctx.backend.app.resolveRule(asRecord(body))
);
