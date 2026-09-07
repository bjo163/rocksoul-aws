import { Router, isRecord, httpError, requirePermission } from '../compat/router.js';
import { requireScopedEntity } from '../access-control.js';
import type { HumanDisposition, ReviewRecord, ReviewStatus } from '@moonwitness/orchestrator';

export const router = new Router();
router.add('POST', '/api/v1/reviews', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE'); if (!authz.ok) return authz.error;
  const p=isRecord(body)?body:{}; if(typeof p.targetId!=='string'||!p.targetId) return httpError(400,'REVIEW_TARGET_REQUIRED');
  if (await ctx.universeStore.persistence.entities().get(p.targetId)) {
    const scope = await requireScopedEntity(req, ctx, p.targetId);
    if (!scope.ok) return scope.error;
  }
  const actor=authz.user?.userId??'SERVICE-API-001';
  try {
    const review = await ctx.application.createReview({ targetId: p.targetId, requestedBy: actor, actorId: actor, assigneeId: typeof p.assigneeId === 'string' ? p.assigneeId : null, gateDecision: typeof p.gateDecision === 'string' ? p.gateDecision : 'REQUIRE_HUMAN_REVIEW', evidenceRefs: Array.isArray(p.evidenceRefs) ? p.evidenceRefs.filter((x): x is string => typeof x === 'string') : [] });
    return {statusCode:201,body:review};
  } catch (error) {
    return httpError(409, 'REVIEW_CREATE_REJECTED', error instanceof Error ? error.message : String(error));
  }
});
