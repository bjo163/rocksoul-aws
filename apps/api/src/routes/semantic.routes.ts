import { Router, requirePermission } from '../compat/router.js';

export const semanticRouter = new Router();

semanticRouter.add('GET', '/api/v1/semantic/registry', async (req, _reply, _params, _body, _query, ctx) => {
  if (process.env.NODE_ENV === 'production') {
    const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
    if (!authz.ok) return authz.error;
  }
  return ctx.semanticRegistry.snapshot();
});
