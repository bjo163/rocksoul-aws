import { Router, isRecord, httpError, requirePermission } from '../compat/router.js';
import { requireScopedEntity } from '../access-control.js';

export const router = new Router();
router.add('POST', '/api/v1/evaluate', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE');
  if (!authz.ok) return authz.error;
  const p = isRecord(body) ? body : {};
  if (typeof p.target === 'string' && p.target && await ctx.universeStore.persistence.entities().get(p.target)) {
    const scope = await requireScopedEntity(req, ctx, p.target);
    if (!scope.ok) return scope.error;
  }
  const input = isRecord(p.input) ? p.input : {};
  const evaluationId = typeof p.target === 'string' && p.target ? p.target : `EVAL-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const text = typeof input.text === 'string' ? input.text : (typeof p.text === 'string' ? p.text : '');
  if (!text) return httpError(400, 'TEXT_REQUIRED');
  const options = isRecord(input.options) ? { ...input.options } : {};
  const actorId=authz.user?.userId ?? 'SERVICE-API-001';
  const eventId=`EVT-MIZAN-${evaluationId}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  try {
    const workflow = await ctx.application.evaluate({
      evaluationId,
      actorId,
      eventId,
      text,
      options,
      semanticObservation: isRecord(p.semanticObservation) ? p.semanticObservation : undefined,
      modelVersion: '4.32.0',
      source: '/api/v1/evaluate',
    });
    return workflow;
  } catch (error) {
    const code = error instanceof Error ? (error as Error & { code?: unknown }).code : undefined;
    if (code === 'INVALID_ANALYSIS_CONTRACT') return httpError(500, 'INVALID_ANALYSIS_CONTRACT', error instanceof Error ? error.message : String(error));
    if (code === 'WITNESS_ROOT_MISSING') return httpError(500, 'EVALUATION_PERSISTENCE_FAILED', error instanceof Error ? error.message : String(error));
    return httpError(500, 'EVALUATION_PERSISTENCE_FAILED', error instanceof Error ? error.message : String(error));
  }
});
