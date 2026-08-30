import { Router, isRecord, httpError, requireAuthenticated } from '../compat/router.js';
import { requireScopedEntity } from '../access-control.js';

export const router = new Router();
router.add('POST', '/api/v1/resource/:id/evidence', async (req, _reply, params, body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  const scope = await requireScopedEntity(req, ctx, params.id);
  if (!scope.ok) return scope.error;
  if (scope.entity.type !== 'CASE') return httpError(404, 'RESOURCE_NOT_FOUND');
  const p = isRecord(body) ? body : {};
  const status = typeof p.status === 'string' ? p.status.toUpperCase() : 'UNKNOWN';
  const allowed = new Set(['OBSERVED', 'SUPPORTED', 'VERIFIED', 'CORROBORATED', 'INFERRED', 'UNKNOWN', 'CONFLICTED']);
  if (!allowed.has(status)) return httpError(400, 'INVALID_EVIDENCE_STATUS');
  if (!['ADMIN', 'REVIEWER'].some((role) => scope.user.roles.includes(role)) && status !== 'OBSERVED') return httpError(403, 'EVIDENCE_STATUS_REVIEW_REQUIRED');
  const payload = isRecord(p.payload) ? p.payload : {};
  const evidenceId = typeof p.evidenceId === 'string' && p.evidenceId ? p.evidenceId : `EVD-${params.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const history=await ctx.universeStore.listCaseEvidence(params.id);
  if(history.some((item)=>isRecord(item)&&item.evidenceId===evidenceId)) return httpError(409,'EVIDENCE_IMMUTABLE','Create a new evidenceId and use supersedes instead of updating an existing record.');
  const supersedes=typeof p.supersedes==='string'&&p.supersedes?p.supersedes:undefined;
  if(supersedes){
    if(supersedes===evidenceId) return httpError(400,'EVIDENCE_SELF_SUPERSESSION');
    if(!history.some((item)=>isRecord(item)&&item.evidenceId===supersedes)) return httpError(404,'SUPERSEDED_EVIDENCE_NOT_FOUND');
    if(typeof p.supersessionReason!=='string'||!p.supersessionReason.trim()) return httpError(400,'SUPERSESSION_REASON_REQUIRED');
    if(history.some((item)=>isRecord(item)&&isRecord(item.payload)&&item.payload.supersedes===supersedes)) return httpError(409,'EVIDENCE_ALREADY_SUPERSEDED');
  }
  const actorId = scope.user.userId;
  try {
    return await ctx.application.evidence({
      entityId: params.id,
      actorId,
      evidenceId,
      sourceType: typeof p.sourceType === 'string' ? p.sourceType : undefined,
      reference: typeof p.reference === 'string' ? p.reference : undefined,
      status,
      confidence: typeof p.confidence === 'number' ? p.confidence : undefined,
      payload,
      supersedes,
      supersessionReason: typeof p.supersessionReason === 'string' ? p.supersessionReason : undefined,
      submittedThrough: '/api/v1/resource/:id/evidence',
    });
  } catch (error) {
    const code = error instanceof Error ? (error as Error & { code?: unknown }).code : undefined;
    if (code === 'EVIDENCE_IMMUTABLE') return httpError(409, 'EVIDENCE_IMMUTABLE', error instanceof Error ? error.message : String(error));
    if (code === 'EVIDENCE_SELF_SUPERSESSION') return httpError(400, 'EVIDENCE_SELF_SUPERSESSION');
    if (code === 'SUPERSEDED_EVIDENCE_NOT_FOUND') return httpError(404, 'SUPERSEDED_EVIDENCE_NOT_FOUND');
    if (code === 'SUPERSESSION_REASON_REQUIRED') return httpError(400, 'SUPERSESSION_REASON_REQUIRED');
    if (code === 'EVIDENCE_ALREADY_SUPERSEDED') return httpError(409, 'EVIDENCE_ALREADY_SUPERSEDED');
    return httpError(500, 'EVIDENCE_PERSISTENCE_FAILED', error instanceof Error ? error.message : String(error));
  }
});
