import { Router, asRecord, httpError, requirePermission } from '../router.js';
import { boundedFilter, cursorQueryBounds, listQueryBounds, rejectUnsupportedSort, stableCursorPage } from '../query-bounds.js';

export const entitiesRouter = new Router();

/** Legacy graph routes are a development compatibility surface, never public-product APIs. */
async function legacyAccess(req: any, ctx: any, permission: 'READ_AUDIT' | 'COMMAND') {
  if (process.env.NODE_ENV !== 'production') return null;
  if (process.env.MOONWITNESS_LEGACY_API !== 'enabled') return httpError(410, 'LEGACY_API_DISABLED');
  const authz = await requirePermission(req, ctx.auth, permission);
  return authz.ok ? null : authz.error;
}

entitiesRouter.add('GET', '/api/v1/entities', async (req, _reply, _params, _body, query, ctx) => {
  const denied = await legacyAccess(req, ctx, 'READ_AUDIT'); if (denied) return denied;
  const sort = rejectUnsupportedSort(query);
  if (!sort.ok) return httpError(400, sort.code);
  const type = boundedFilter(query.get('type'), 128);
  const state = boundedFilter(query.get('state'), 128);
  const q = boundedFilter(query.get('q'));
  if (!type.ok) return httpError(400, type.code);
  if (!state.ok) return httpError(400, state.code);
  if (!q.ok) return httpError(400, q.code);
  const results = ctx.backend.runtime.graph.listEntities({ type: type.value, state: state.value, q: q.value });
  if (query.has('cursor')) {
    const cursor = cursorQueryBounds(query, query.get('cursor'), query.get('limit'), 50);
    if (!cursor.ok) return httpError(400, cursor.code);
    return stableCursorPage(results, cursor.value.limit, cursor.value.cursor, (entity: unknown) => {
      const rec = (entity && typeof entity === 'object') ? (entity as Record<string, unknown>) : {};
      return String(rec.entityId ?? rec.id ?? '');
    });
  }
  const pagination = listQueryBounds(query, query.get('limit'), 50);
  if (!pagination.ok) return httpError(400, pagination.code);
  return results.slice(pagination.value.offset, pagination.value.offset + pagination.value.limit);
});

entitiesRouter.add('GET', '/api/v1/entities/:id', async (req, _reply, params, _body, _query, ctx) => {
  const denied = await legacyAccess(req, ctx, 'READ_AUDIT'); if (denied) return denied;
  return ctx.backend.runtime.graph.getEntity(params.id) ?? httpError(404, 'ENTITY_NOT_FOUND');
});

entitiesRouter.add('GET', '/api/v1/entities/:id/graph', async (req, _reply, params, _body, _query, ctx) => {
  const denied = await legacyAccess(req, ctx, 'READ_AUDIT'); if (denied) return denied;
  return ctx.backend.app.graph(params.id) ?? httpError(404, 'GRAPH_NOT_FOUND');
});

entitiesRouter.add('POST', '/api/v1/entities', async (req, _reply, _params, body, _query, ctx) => {
  const denied = await legacyAccess(req, ctx, 'COMMAND'); if (denied) return denied;
  return { statusCode: 201, body: await ctx.backend.app.createEntity(asRecord(body)) };
});

entitiesRouter.add('PUT', '/api/v1/entities/:id', async (req, _reply, params, body, _query, ctx) => {
  const denied = await legacyAccess(req, ctx, 'COMMAND'); if (denied) return denied;
  return ctx.backend.app.updateEntity(params.id, asRecord(body));
});

entitiesRouter.add('DELETE', '/api/v1/entities/:id', async (req, _reply, params, _body, _query, ctx) => {
  const denied = await legacyAccess(req, ctx, 'COMMAND'); if (denied) return denied;
  return ctx.backend.app.deleteEntity(params.id);
});

entitiesRouter.add('POST', '/api/v1/relations', async (req, _reply, _params, body, _query, ctx) => {
  const denied = await legacyAccess(req, ctx, 'COMMAND'); if (denied) return denied;
  return { statusCode: 201, body: await ctx.backend.app.createRelation(asRecord(body)) };
});

entitiesRouter.add('POST', '/api/v1/events', async (req, _reply, _params, body, _query, ctx) => {
  const denied = await legacyAccess(req, ctx, 'COMMAND'); if (denied) return denied;
  return { statusCode: 201, body: await ctx.backend.app.recordEvent(asRecord(body)) };
});

entitiesRouter.add('POST', '/api/v1/types', async (req, _reply, _params, body, _query, ctx) => {
  const denied = await legacyAccess(req, ctx, 'COMMAND'); if (denied) return denied;
  return { statusCode: 201, body: ctx.backend.models.define(asRecord(body)) };
});

entitiesRouter.add('POST', '/api/v1/rules/resolve', async (req, _reply, _params, body, _query, ctx) => {
  const denied = await legacyAccess(req, ctx, 'COMMAND'); if (denied) return denied;
  return ctx.backend.app.resolveRule(asRecord(body));
});
