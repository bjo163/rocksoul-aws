import { Router, isRecord, httpError, requirePermission, idempotencyKey, bearerToken } from '../compat/router.js';
import { IdempotencyStore } from '@moonwitness/persistence';
import { denyForeignRidWrite } from '../access-control.js';
import { sha256 } from '@moonwitness/witness';
import { scopedIdempotencyKey, idempotencyError } from './route-utils.js';

export const router = new Router();
router.add('POST', '/api/v1/observe', async (req, _reply, _params, body, _query, ctx) => {
  try {
    const productionAuth = process.env.NODE_ENV === 'production' ? await requirePermission(req, ctx.auth, 'OBSERVE') : null;
    if (productionAuth && !productionAuth.ok) return productionAuth.error;
    const p = isRecord(body) ? body : {};
    const payload = isRecord(p.payload) ? p.payload : p;
    const authUser = productionAuth?.ok ? productionAuth.user : await ctx.auth.authenticate(bearerToken(req));
    const actorId = authUser?.userId ?? 'SERVICE-API-001';
    const requestKey = idempotencyKey(req);
    let entityId = typeof p.entityId === 'string' ? p.entityId : 'UNBOUND';
    if (entityId === 'UNBOUND') entityId = requestKey ? `OBS-${sha256(`${actorId}:${requestKey}`).slice(0, 24)}` : `OBS-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const foreign = await denyForeignRidWrite(req, ctx, entityId);
    if (foreign) return foreign;
    return await ctx.idempotency.execute(scopedIdempotencyKey(req, actorId, `OBSERVE:${entityId}`), IdempotencyStore.hash(p), async () => {
      if (!ctx.universeStore.persistence.store.batch) throw new Error('TRANSACTION_NOT_SUPPORTED');
      const source = typeof p.source === 'string' ? p.source : 'API';
      const workflow = await ctx.application.observe({
        entityId,
        actorId,
        eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        source,
        payload,
        context: isRecord(p.context) ? p.context : {},
        ownerRid: authUser?.rid,
      });
      return { statusCode: 200, body: workflow };
    });
  } catch(error) {
    const conflict = idempotencyError(error);
    if (conflict) return conflict;
    return httpError(500, 'OBSERVATION_FAILED', error instanceof Error ? error.message : String(error));
  }
});
