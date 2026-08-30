import { Router, isRecord, httpError, requirePermission, requireAuthenticated, idempotencyKey, bearerToken } from '../compat/router.js';
import { scopedIdempotencyKey, idempotencyError } from './route-utils.js';
import { buildAiAnalysis, analyzeWithProvider } from '@moonwitness/cosmic-engine';
import { IdempotencyStore } from '@moonwitness/persistence';
import { replayCaseEvents, createUnpredictableIngress, triggerIngress, composeReminderBundle } from '@moonwitness/orchestrator';
import { v } from '../validator.js';
import { createReview, transitionReview, type HumanDisposition, type ReviewRecord, type ReviewStatus } from '@moonwitness/orchestrator';
import { buildXrpWorkspace } from '../xrp-workspace.js';
import { denyForeignRidWrite, requireScopedEntity } from '../access-control.js';
import { cursorQueryBounds, listQueryBounds, queryFilters, stableCursorPage } from '../query-bounds.js';

export const v1Router = new Router();

v1Router.add('POST', '/api/v1/query', async (req, _reply, _params, body, query, ctx) => {
  if (process.env.NODE_ENV === 'production') {
    const authz = await requirePermission(req, ctx.auth, 'ANALYZE');
    if (!authz.ok) return authz.error;
  }
  const p = isRecord(body) ? body : {};
  const filters = queryFilters(p, query);
  const pagination = listQueryBounds(query, p.limit ?? query.get('limit'), 50);
  const usesCursor = Object.hasOwn(p, 'cursor') || query.has('cursor');
  const suppliedCursor = Object.hasOwn(p, 'cursor') ? p.cursor : query.get('cursor');
  const cursorPagination = cursorQueryBounds(query, suppliedCursor, p.limit ?? query.get('limit'), 50);
  if (!filters.ok) return httpError(400, filters.code);
  if (!pagination.ok) return httpError(400, pagination.code);
  if (!cursorPagination.ok) return httpError(400, cursorPagination.code);
  if (filters.value.entityId) return { type: 'ENTITY', result: ctx.backend.runtime.graph.getEntity(filters.value.entityId) ?? null };
  const entities = ctx.backend.runtime.graph.listEntities({ type: filters.value.type, q: filters.value.q });
  if (usesCursor) {
    const page = stableCursorPage(entities, cursorPagination.value.limit, cursorPagination.value.cursor, (entity) => String((entity as { entityId?: unknown }).entityId));
    return { type: 'ENTITIES', results: page.results, page: { limit: cursorPagination.value.limit, cursor: suppliedCursor, nextCursor: page.nextCursor ?? null, order: 'entityId:asc' } };
  }
  return { type: 'ENTITIES', results: entities.slice(pagination.value.offset, pagination.value.offset + pagination.value.limit) };
});

v1Router.add('GET', '/api/v1/xrp/workspace', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  if (!authz.user?.rid) return httpError(403, 'RID_REQUIRED', 'This account is not connected to a RID workspace.');
  return buildXrpWorkspace(ctx.universeStore.persistence, ctx.witness.dag, { userId: authz.user.userId, rid: authz.user.rid });
});

v1Router.add('POST', '/api/v1/xrp/cases', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  if (!authz.user?.rid) return httpError(403, 'RID_REQUIRED');
  const p = isRecord(body) ? body : {};
  const title = typeof p.title === 'string' ? p.title.trim().slice(0, 160) : '';
  if (!title) return httpError(400, 'CASE_TITLE_REQUIRED');
  const description = typeof p.description === 'string' ? p.description.trim().slice(0, 10_000) : '';
  const actorId = authz.user.userId;
  try {
    return await ctx.idempotency.execute(scopedIdempotencyKey(req, actorId, 'XRP_CASE_CREATE'), IdempotencyStore.hash({ title, description }), async () => {
      const id = `XRP-CASE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const entity = await ctx.universeStore.persistence.asActor(actorId).saveEntity({ id, type: 'CASE', version: 1, payload: { id, type: 'CASE', version: 1, ownerRid: authz.user.rid, title, description, status: 'OBSERVED', observation: { source: 'XRP_PUBLIC', payload: { title } }, updatedAt: now } });
      await ctx.universeStore.persistence.asActor(actorId).appendEvent({ eventId: `EVT-${id}-CREATED`, entityId: id, eventType: 'XRP.CASE.CREATED', payload: { title, ownerRid: authz.user.rid }, actorId });
      return { statusCode: 201, body: { id: entity.id, status: 'OBSERVED', version: entity.version ?? 1 } };
    });
  } catch (error) {
    return idempotencyError(error) ?? httpError(500, 'XRP_CASE_CREATE_FAILED');
  }
});

v1Router.add('POST', '/api/v1/xrp/cases/:id/evidence', async (req, _reply, params, body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  const scope = await requireScopedEntity(req, ctx, params.id, { allowOversight: false });
  if (!scope.ok) return scope.error;
  if (scope.entity.type !== 'CASE') return httpError(404, 'RESOURCE_NOT_FOUND');
  const p = isRecord(body) ? body : {};
  const sourceType = typeof p.sourceType === 'string' ? p.sourceType.trim().slice(0, 80) : 'USER_SUBMITTED';
  const reference = typeof p.reference === 'string' ? p.reference.trim().slice(0, 240) : undefined;
  const note = typeof p.note === 'string' ? p.note.trim().slice(0, 10_000) : '';
  if (!note && !reference) return httpError(400, 'EVIDENCE_CONTENT_REQUIRED');
  const actorId = scope.user.userId;
  try {
    return await ctx.idempotency.execute(scopedIdempotencyKey(req, actorId, `XRP_EVIDENCE:${params.id}`), IdempotencyStore.hash({ sourceType, reference, note }), async () => {
      const evidence = await ctx.universeStore.persistence.asActor(actorId).saveEvidence({ evidenceId: `EVD-${params.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, entityId: params.id, sourceType: sourceType || 'USER_SUBMITTED', reference, status: 'OBSERVED', payload: { note, submittedThrough: 'XRP_PUBLIC', submittedAt: new Date().toISOString() } });
      await ctx.universeStore.persistence.asActor(actorId).appendEvent({ eventId: `EVT-${evidence.evidenceId}`, entityId: params.id, eventType: 'XRP.EVIDENCE.SUBMITTED', payload: { evidenceId: evidence.evidenceId, status: 'OBSERVED' }, actorId });
      return { statusCode: 201, body: { id: params.id, status: 'EVIDENCE_RECORDED', evidence: { id: evidence.evidenceId, status: evidence.status, sourceType: evidence.sourceType, reference: evidence.reference }, reanalysisRequired: true } };
    });
  } catch (error) {
    return idempotencyError(error) ?? httpError(500, 'XRP_EVIDENCE_CREATE_FAILED');
  }
});

v1Router.add('POST', '/api/v1/xrp/work-items', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  if (!authz.user?.rid) return httpError(403, 'RID_REQUIRED');
  const p = isRecord(body) ? body : {};
  const type = typeof p.type === 'string' ? p.type.toUpperCase() : 'TASK';
  if (!['PROJECT', 'TASK', 'RESOURCE'].includes(type)) return httpError(400, 'INVALID_WORK_ITEM_TYPE');
  const title = typeof p.title === 'string' ? p.title.trim().slice(0, 160) : '';
  if (!title) return httpError(400, 'WORK_ITEM_TITLE_REQUIRED');
  const dueAt = typeof p.dueAt === 'string' && !Number.isNaN(Date.parse(p.dueAt)) ? new Date(p.dueAt).toISOString() : undefined;
  const actorId = authz.user.userId;
  try {
    return await ctx.idempotency.execute(scopedIdempotencyKey(req, actorId, 'XRP_WORK_ITEM_CREATE'), IdempotencyStore.hash({ type, title, dueAt }), async () => {
      const id = `XRP-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const entity = await ctx.universeStore.persistence.asActor(actorId).saveEntity({ id, type, version: 1, payload: { id, ownerRid: authz.user.rid, title, status: 'OPEN', ...(dueAt ? { dueAt } : {}), updatedAt: new Date().toISOString() } });
      await ctx.universeStore.persistence.asActor(actorId).appendEvent({ eventId: `EVT-${id}-CREATED`, entityId: id, eventType: 'XRP.WORK_ITEM.CREATED', payload: { type, title }, actorId });
      return { statusCode: 201, body: { id: entity.id, type, status: 'OPEN', version: entity.version ?? 1 } };
    });
  } catch (error) {
    return idempotencyError(error) ?? httpError(500, 'XRP_WORK_ITEM_CREATE_FAILED');
  }
});

v1Router.add('POST', '/api/v1/xrp/cases/:id/request-review', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  const scope = await requireScopedEntity(req, ctx, params.id, { allowOversight: false });
  if (!scope.ok) return scope.error;
  if (scope.entity.type !== 'CASE') return httpError(404, 'RESOURCE_NOT_FOUND');
  const actorId = scope.user.userId;
  try {
    return await ctx.idempotency.execute(scopedIdempotencyKey(req, actorId, `XRP_REVIEW:${params.id}`), IdempotencyStore.hash({ targetId: params.id }), async () => {
      const open = (await ctx.universeStore.persistence.entities().list('HUMAN_REVIEW')).find((entity: any) => isRecord(entity.payload) && entity.payload.targetId === params.id && entity.payload.status !== 'DISPOSED');
      if (open) return { statusCode: 409, body: { error: 'REVIEW_ALREADY_OPEN' } };
      const review = createReview({ targetId: params.id, requestedBy: actorId, assigneeId: null, gateDecision: 'REQUIRE_HUMAN_REVIEW', evidenceRefs: (await ctx.universeStore.listCaseEvidence(params.id)).map((item: any) => item.evidenceId) });
      await ctx.universeStore.persistence.asActor(actorId).saveEntity({ id: review.reviewId, type: 'HUMAN_REVIEW', version: review.version, payload: review });
      await ctx.universeStore.persistence.asActor(actorId).appendEvent({ eventId: `EVT-${review.reviewId}-CREATED`, entityId: params.id, eventType: 'HUMAN_REVIEW.REQUESTED_BY_OWNER', payload: { reviewId: review.reviewId }, actorId });
      return { statusCode: 201, body: review };
    });
  } catch (error) {
    return idempotencyError(error) ?? httpError(500, 'XRP_REVIEW_REQUEST_FAILED');
  }
});

v1Router.add('POST', '/api/v1/command', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'COMMAND');
  if (!authz.ok) return authz.error;
  
  const cmdSchema = v.object({
    command: v.string(),
    payload: v.any(),
    target: v.optional(v.string())
  });

  const valid = cmdSchema(body);
  if (!valid.valid) return httpError(400, 'BAD_REQUEST', valid.errors.join(', '));
  
  const p = valid.value;
  const command = p.command;
  const data = isRecord(p.payload) ? p.payload : {};
  const commandTarget = command === 'CREATE_ENTITY' ? (p.target || (typeof data.id === 'string' ? data.id : '')) : command === 'RECORD_EVENT' ? String(data.entityId ?? data.subject ?? '') : '';
  if (commandTarget) {
    const foreign = await denyForeignRidWrite(req, ctx, commandTarget);
    if (foreign) return foreign;
  }
  if (command === 'CREATE_RELATION') {
    for (const target of [String(data.from ?? data.fromId ?? ''), String(data.to ?? data.toId ?? '')]) {
      if (!target) continue;
      const foreign = await denyForeignRidWrite(req, ctx, target);
      if (foreign) return foreign;
    }
  }
  
  const key = scopedIdempotencyKey(req, authz.user?.userId ?? 'SERVICE-API-001', 'COMMAND');
  try {
    return await ctx.idempotency.execute(key, IdempotencyStore.hash(p), async () => {
      switch(command) {
        case 'CREATE_ENTITY': { const id = p.target || (typeof data.id === 'string' ? data.id : `ENT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`); const rawPayload = isRecord(data.payload) ? data.payload : data; const entity = await ctx.universeStore.persistence.asActor(authz.user?.userId ?? 'SERVICE-API-001').saveEntity({id, type: typeof data.type === 'string' ? data.type : 'ENTITY', payload: {...rawPayload, ...(authz.user?.rid ? {ownerRid: authz.user.rid} : {})}}); return {statusCode: 201, body: entity}; }
        case 'CREATE_RELATION': { const relation = await ctx.universeStore.persistence.asActor(authz.user?.userId ?? 'SERVICE-API-001').saveRelation({id: typeof data.id === 'string' ? data.id : `REL-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, fromId: String(data.from ?? data.fromId ?? ''), type: String(data.type ?? 'RELATED_TO'), toId: String(data.to ?? data.toId ?? ''), payload: isRecord(data.metadata) ? data.metadata : (isRecord(data.payload) ? data.payload : {})}); return {statusCode: 201, body: relation}; }
        case 'RECORD_EVENT': { const event = await ctx.universeStore.persistence.asActor(authz.user?.userId ?? 'SERVICE-API-001').appendEvent({eventId: typeof data.eventId === 'string' ? data.eventId : `EVT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, entityId: String(data.entityId ?? data.subject ?? ''), eventType: String(data.type ?? data.eventType ?? 'EVENT'), payload: isRecord(data.context) ? data.context : (isRecord(data.payload) ? data.payload : {}), actorId: authz.user?.userId ?? 'SERVICE-API-001'}); return {statusCode: 201, body: event}; }
        default: return {statusCode: 400, body: {error: 'COMMAND_NOT_SUPPORTED'}};
      }
    });
  } catch(error) { 
    if (error instanceof Error && (error as any).code === 'IDEMPOTENCY_CONFLICT') return httpError(409, 'IDEMPOTENCY_CONFLICT');
    if (error instanceof Error && (error as any).code === 'CASE_VERSION_CONFLICT') return httpError(409, 'CASE_VERSION_CONFLICT', error.message); 
    return httpError(500, 'COMMAND_FAILED', error instanceof Error ? error.message : String(error)); 
  }
});

v1Router.add('GET', '/api/v1/resource/:id/audit', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  const scope = await requireScopedEntity(req, ctx, params.id);
  if (!scope.ok) return scope.error;
  return { id: params.id, audit: await ctx.universeStore.auditHistory(params.id), integrity: await ctx.universeStore.verifyAudit() };
});

v1Router.add('GET', '/api/v1/resource/:id/replay', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  const scope = await requireScopedEntity(req, ctx, params.id);
  if (!scope.ok) return scope.error;
  const events = await ctx.universeStore.listCaseEvents(params.id);
  return { id: params.id, replay: replayCaseEvents(events, params.id), ledger: await ctx.universeStore.verifyLedger() };
});

v1Router.add('GET', '/api/v1/resource/:id', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  const id = params.id;
  const raw = await ctx.universeStore.persistence.entities().get(id);
  if (raw) {
    const scope = await requireScopedEntity(req, ctx, id);
    if (!scope.ok) return scope.error;
  }
  const persisted = raw?.type === 'CASE' ? await ctx.universeStore.getCase(id) : null;
  if (persisted) return { id, kind: 'RESOURCE', entity: persisted, events: await ctx.universeStore.listCaseEvents(id), evidence: await ctx.universeStore.listCaseEvidence(id), graph: ctx.backend.app.graph(id) ?? null };
  const entity = ctx.backend.runtime.graph.getEntity(id);
  if (!entity) return httpError(404, 'RESOURCE_NOT_FOUND');
  return { id, kind: 'RESOURCE', entity, graph: ctx.backend.app.graph(id) ?? null };
});

v1Router.add('GET', '/api/v1/reviews', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE'); if (!authz.ok) return authz.error;
  const reviews = await ctx.universeStore.persistence.entities().list('HUMAN_REVIEW');
  if (authz.user.roles.includes('ADMIN')) return { reviews };
  return { reviews: reviews.filter((entity: any) => {
    const payload = isRecord(entity.payload) ? entity.payload : {};
    return payload.assigneeId === null || payload.assigneeId === undefined || payload.assigneeId === authz.user.userId;
  }) };
});

v1Router.add('POST', '/api/v1/reviews/:id/transition', async (req, _reply, params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE'); if (!authz.ok) return authz.error;
  const current=await ctx.universeStore.persistence.entities().get(params.id); if(!current||current.type!=='HUMAN_REVIEW') return httpError(404,'REVIEW_NOT_FOUND');
  const currentPayload = isRecord(current.payload) ? current.payload : {};
  const targetId = typeof currentPayload.targetId === 'string' ? currentPayload.targetId : '';
  if (!targetId) return httpError(409, 'REVIEW_TARGET_INVALID');
  if (await ctx.universeStore.persistence.entities().get(targetId)) {
    const scope = await requireScopedEntity(req, ctx, targetId);
    if (!scope.ok) return scope.error;
  }
  const p=isRecord(body)?body:{}; const actor=authz.user?.userId??'SERVICE-API-001'; if(typeof p.status!=='string') return httpError(400,'REVIEW_STATUS_REQUIRED');
  const requestedAssignee = typeof p.assigneeId === 'string' ? p.assigneeId : undefined;
  if (!authz.user.roles.includes('ADMIN') && requestedAssignee && requestedAssignee !== actor) return httpError(403, 'REVIEW_ASSIGNMENT_FORBIDDEN');
  const currentAssignee = typeof currentPayload.assigneeId === 'string' ? currentPayload.assigneeId : null;
  const assigneeId = requestedAssignee ?? (!authz.user.roles.includes('ADMIN') && !currentAssignee ? actor : undefined);
  try {
    return await ctx.application.transitionReview({ current: current.payload as ReviewRecord, currentVersion: Number(current.version ?? currentPayload.version ?? 1), transition: { status: p.status as ReviewStatus, actorId: actor, rationale: typeof p.rationale === 'string' ? p.rationale : undefined, disposition: typeof p.disposition === 'string' ? p.disposition as HumanDisposition : undefined, assigneeId } });
  } catch(error) { return httpError(409,'REVIEW_TRANSITION_REJECTED',error instanceof Error?error.message:String(error)); }
});

v1Router.add('GET', '/api/v1/resource/:id/evidence', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  const scope = await requireScopedEntity(req, ctx, params.id);
  if (!scope.ok) return scope.error;
  if (scope.entity.type !== 'CASE') return httpError(404, 'RESOURCE_NOT_FOUND');
  const evidence=await ctx.universeStore.listCaseEvidence(params.id);
  const supersededBy=new Map<string,string>();
  for(const item of evidence){const prior=isRecord(item.payload)&&typeof item.payload.supersedes==='string'?item.payload.supersedes:null;if(prior)supersededBy.set(prior,item.evidenceId);}
  return { id: params.id, evidence: evidence.map((item:any)=>({...item,supersedes:isRecord(item.payload)&&typeof item.payload.supersedes==='string'?item.payload.supersedes:undefined,supersededBy:supersededBy.get(item.evidenceId)})) };
});

v1Router.add('POST', '/api/v1/ingress/reminder', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'ANALYZE'); 
  if (!authz.ok) return authz.error;
  const p = isRecord(body) ? body : {};
  const generated = await createUnpredictableIngress({
    minDelayMs: typeof p.minDelayMs === 'number' ? p.minDelayMs : undefined,
    maxDelayMs: typeof p.maxDelayMs === 'number' ? p.maxDelayMs : undefined,
    channelId: typeof p.channelId === 'string' ? p.channelId : undefined,
    reference: typeof p.reference === 'string' ? p.reference : undefined,
    reminder: typeof p.reminder === 'string' ? p.reminder : undefined,
  });
  return { id: generated.id, status: 'SCHEDULED_MODEL_EVENT', channelId: generated.channelId, eventType: generated.eventType, reference: generated.reference, reminder: generated.reminder, reminderBundle: generated.reminderBundle, unpredictable: true, modelOnly: true, disclaimer: generated.disclaimer };
});

v1Router.add('POST', '/api/v1/ingress/reminder/trigger', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'ANALYZE'); 
  if (!authz.ok) return authz.error;
  const p = isRecord(body) ? body : {};
  if (!isRecord(p.ingress)) return httpError(400, 'INGRESS_REQUIRED');
  const triggered = await triggerIngress(p.ingress as any);
  return { ...triggered, status: 'TRIGGERED_MODEL_EVENT' };
});

v1Router.add('POST', '/api/v1/ai/analyze', async (_req, _reply, _params, body, _query, ctx) => {
  const payload = isRecord(body) ? body : {};
  const text = typeof payload.text === 'string' ? payload.text : '';
  if (!text) return httpError(400, 'BAD_REQUEST', 'text is required');
  const options = isRecord(payload.options) ? { ...payload.options } : {};
  if (payload.semanticObservation) options.semanticObservation = payload.semanticObservation;
  if (payload.includeReminder === true) options.includeReminder = true;
  if (typeof payload.reminderSeed === 'number') options.reminderSeed = payload.reminderSeed;
  options.sourceGraph = {
    search: ({ q, limit = 10 }: { q: string; limit?: number }) => ctx.backend.runtime.graph.listEntities({ q }).slice(0, limit).map((e: any) => ({ ...e, id: e.entityId })),
  };
  const analysis = isRecord(options.semanticObservation) ? buildAiAnalysis(text, options) : await analyzeWithProvider(text, { ...options, provider: ctx.semanticProvider });
  const responseAnalysis = { ...analysis, semantic: (analysis as any).semanticVector ?? (analysis as any).semantic ?? null };
  const finalResponse:any = { ...responseAnalysis };
  if (options.includeReminder) finalResponse.reminderBundle = await composeReminderBundle(typeof options.reminderSeed === 'number' ? options.reminderSeed : undefined);
  const authz=await requirePermission(_req,ctx.auth,'ANALYZE');
  if(authz.ok){
    const analysisId=`AI-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const witness=await ctx.witness.commitMizan({ recordId:analysisId, recordType:'AI_ANALYSIS', actorId:authz.user?.userId ?? 'SERVICE-AI-001', text, mizan:(analysis as any).mizan ?? null, semantic:(analysis as any).semanticVector ?? (analysis as any).semantic ?? null, lifecycle:{caseLifecycle:(analysis as any).lifecycle ?? null,moralLifecycle:(analysis as any).moralLifecycle ?? null}, reviewGate:(analysis as any).reviewGate ?? null, modelVersion:'4.32.0', source:'/api/v1/ai/analyze' });
    finalResponse.witness={ committed:true, nodeId:witness.node.nodeId, hash:witness.node.hash, root:witness.root, checkpointId:witness.checkpoint?.checkpoint.checkpointId ?? null };
  } else finalResponse.witness={ committed:false, reason:'ANALYZE_PERMISSION_REQUIRED_FOR_LEDGER_COMMIT' };
  return finalResponse;
});
