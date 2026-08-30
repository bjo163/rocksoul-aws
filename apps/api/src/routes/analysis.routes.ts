import { Router, isRecord, httpError, requirePermission, idempotencyKey, bearerToken } from '../compat/router.js';
import { IdempotencyStore } from '@moonwitness/persistence';
import { denyForeignRidWrite, requireScopedEntity } from '../access-control.js';
import { sha256 } from '@moonwitness/witness';
import { scopedIdempotencyKey, idempotencyError } from './route-utils.js';

export const router = new Router();
router.add('POST', '/api/v1/analyze', async (req, _reply, _params, body, _query, ctx) => {
  const productionAuth = process.env.NODE_ENV === 'production' ? await requirePermission(req, ctx.auth, 'ANALYZE') : null;
  if (productionAuth && !productionAuth.ok) return productionAuth.error;
  const p = isRecord(body) ? body : {};
  const authUser = productionAuth?.ok ? productionAuth.user : await ctx.auth.authenticate(bearerToken(req));
  const actorId = authUser?.userId ?? 'SERVICE-API-001';
  const requestKey = idempotencyKey(req);
  const caseId = typeof p.caseId === 'string' && p.caseId ? p.caseId : requestKey ? `CASE-${sha256(`${actorId}:${requestKey}`).slice(0, 24)}` : `CASE-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const foreign = await denyForeignRidWrite(req, ctx, caseId);
  if (foreign) return foreign;
  const observation = isRecord(p.observation) ? p.observation : {};
  const text = typeof observation.text === 'string' ? observation.text : (typeof p.text === 'string' ? p.text : '');
  if (!text) return httpError(400, 'TEXT_REQUIRED');
  try {
    return await ctx.idempotency.execute(scopedIdempotencyKey(req, actorId, `ANALYZE:${caseId}`), IdempotencyStore.hash(p), async () => {
      const options = isRecord(p.options) ? { ...p.options } : {};
      const workflow = await ctx.application.analyze({
        caseId,
        actorId,
        text,
        options,
        semanticObservation: isRecord(p.semanticObservation) ? p.semanticObservation : undefined,
        includeReminder: p.includeReminder === true,
        reminderSeed: typeof p.reminderSeed === 'number' ? p.reminderSeed : undefined,
        ownerRid: authUser?.rid,
        modelVersion: '4.32.0',
        source: '/api/v1/analyze',
      });
      return { statusCode: 200, body: { id: caseId, kind: 'ANALYSIS', status: 'PERSISTED', persisted: { entityId: caseId, version: workflow.aggregate.version, actorId }, witness: workflow.witness, ...workflow.analysis } };
    });
  } catch (error) {
    return idempotencyError(error) ?? httpError(500, 'ANALYSIS_FAILED', error instanceof Error ? error.message : String(error));
  }
});
