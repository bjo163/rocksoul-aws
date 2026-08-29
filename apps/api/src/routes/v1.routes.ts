import { Router, isRecord, httpError, requirePermission, requireAuthenticated, idempotencyKey, bearerToken } from '../router.js';
import { buildAiAnalysis, analyzeWithProvider } from '../../../../src/ai/general-analyzer.js';
import { IdempotencyStore } from '@moonwitness/persistence';
import { replayCaseEvents } from '../../../../src/audit/event-replay.js';
import { composeReminderBundle } from '../../../../src/ingress/revelation-reminder-engine.js';
import { createUnpredictableIngress, triggerIngress } from '../../../../src/ingress/divine-ingress.js';
import { v } from '../validator.js';
import { revelationSemanticCoreSnapshot } from '../../../../src/revelation/revelation-semantic-core.js';
import { revelationGeographyReport } from '../../../../src/revelation/revelation-geography.js';
import { asmaEngineSnapshot } from '../../../../src/revelation/asma/asma-engine.js';
import { divineOntologySnapshot } from '../../../../src/revelation/asma/divine-ontology.js';
import { revelationMoralGraph } from '../../../../src/revelation/moral-graph/revelation-moral-graph.js';
import { fourBookCorpusSnapshot } from '../../../../src/revelation/corpus/four-book-corpus.js';
import { revelationLifecycleSnapshot } from '../../../../src/revelation/lifecycle/revelation-lifecycle.js';
import { revelationGrammarSnapshot } from '../../../../src/revelation/grammar/revelation-grammar.js';
import { createReview, transitionReview, type HumanDisposition, type ReviewRecord, type ReviewStatus } from '@moonwitness/orchestrator';
import { buildXrpWorkspace } from '../xrp-workspace.js';
import { denyForeignRidWrite, requireScopedEntity } from '../access-control.js';
import { sha256 } from '@moonwitness/witness';
import { hasPermission } from '@moonwitness/security';
import { runAnalysisWorkflow, runCreateReviewWorkflow, runEvaluationWorkflow, runEvidenceWorkflow, runObservationWorkflow, runTransitionReviewWorkflow } from '@moonwitness/orchestrator';
import { boundedInteger, cursorQueryBounds, listQueryBounds, queryFilters, stableCursorPage } from '../query-bounds.js';

export const v1Router = new Router();

function publicJob(job: any): Record<string, unknown> {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    ...(job.status === 'FAILED' ? { error: 'JOB_FAILED' } : {}),
  };
}

function scopedIdempotencyKey(req: any, actorId: string, operation: string): string | null {
  const key = idempotencyKey(req);
  return key ? `${actorId}:${operation}:${key}` : null;
}

function idempotencyError(error: unknown) {
  return error instanceof Error && (error as any).code === 'IDEMPOTENCY_CONFLICT'
    ? httpError(409, 'IDEMPOTENCY_CONFLICT')
    : null;
}

v1Router.add('GET', '/api/v1/observability/recent', async (req, _reply, _params, _body, query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  const limit = boundedInteger(query.get('limit'), 100, 1, 250);
  if (!limit.ok) return httpError(400, limit.code);
  return ctx.observability.recent(limit.value);
});

v1Router.add('GET', '/api/v1/stream', async (req, reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;

  reply.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  reply.write('data: {"status": "connected"}\n\n');

  const onTrace = (trace: any) => {
    reply.write(`event: trace\ndata: ${JSON.stringify(trace)}\n\n`);
  };

  const heartbeat = setInterval(async () => {
    try {
      const online = await ctx.auth.getOnlineUsers();
      if (!reply.writableEnded) reply.write(`event: heartbeat\ndata: {"online": ${JSON.stringify(online)}}\n\n`);
    } catch {
      if (!reply.writableEnded) reply.write('event: heartbeat\ndata: {"online": [], "degraded": true}\n\n');
    }
  }, 5000);

  ctx.observability.on('trace', onTrace);

  req.on('close', () => {
    clearInterval(heartbeat);
    ctx.observability.off('trace', onTrace);
  });
  
  return undefined;
});

v1Router.add('GET', '/api/v1/metrics', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'ADMIN');
  if (!authz.ok) return authz.error;
  
  const mem = process.memoryUsage();
  const onlineUsers = await ctx.auth.getOnlineUsers();
  return {
    uptime: process.uptime(),
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
    },
    onlineUsers: onlineUsers.length,
    traces: ctx.observability.recent(10).length // lightweight check
  };
});

v1Router.add('GET', '/api/v1/semantic/registry', async (req, _reply, _params, _body, _query, ctx) => {
  if (process.env.NODE_ENV === 'production') {
    const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
    if (!authz.ok) return authz.error;
  }
  return ctx.semanticRegistry.snapshot();
});

v1Router.add('GET', '/api/v1/revelation/core', async (_req, _reply, _params, _body, _query, _ctx) => revelationSemanticCoreSnapshot(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/geography', async (_req, _reply, _params, _body, _query, _ctx) => revelationGeographyReport(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/asma', async (_req, _reply, _params, _body, _query, _ctx) => asmaEngineSnapshot(process.cwd()));
v1Router.add('GET', '/api/v1/revelation/divine-ontology', async (_req, _reply, _params, _body, _query, _ctx) => divineOntologySnapshot(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/moral-graph', async (_req, _reply, _params, _body, _query, _ctx) => revelationMoralGraph(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/corpora', async (_req, _reply, _params, _body, _query, _ctx) => fourBookCorpusSnapshot(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/lifecycle', async (_req, _reply, _params, _body, _query, _ctx) => revelationLifecycleSnapshot(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/grammar', async (_req, _reply, _params, _body, _query, _ctx) => revelationGrammarSnapshot(process.cwd()));

v1Router.add('GET', '/api/v1/jobs/:id', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  const job = await ctx.jobs.get(params.id);
  if (!job) return httpError(404, 'JOB_NOT_FOUND');
  const requestedBy = isRecord(job.payload) && typeof job.payload.actorId === 'string' ? job.payload.actorId : null;
  if (requestedBy !== authz.user.userId && !hasPermission(authz.user, 'READ_AUDIT')) return httpError(404, 'JOB_NOT_FOUND');
  return publicJob(job);
});

v1Router.add('POST', '/api/v1/jobs/process', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'COMMAND');
  if (!authz.ok) return authz.error;
  return { statusCode: 202, body: { processed: (await ctx.jobs.processAvailable(8)).map(publicJob) } };
});

v1Router.add('POST', '/api/v1/observe', async (req, _reply, _params, body, _query, ctx) => {
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
      const workflow = await runObservationWorkflow({
        entityId,
        actorId,
        eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        source,
        payload,
        context: isRecord(p.context) ? p.context : {},
        ownerRid: authUser?.rid,
      }, {
        loadEntity: (id) => ctx.universeStore.persistence.entities().get(id),
        batch: (work) => ctx.universeStore.persistence.store.batch(work),
        saveEntity: (input) => ctx.universeStore.persistence.asActor(actorId).saveEntity(input),
        appendEvent: (input) => ctx.universeStore.persistence.asActor(actorId).appendEvent(input),
      });
      return { statusCode: 200, body: workflow };
    });
  } catch(error) {
    const conflict = idempotencyError(error);
    if (conflict) return conflict;
    return httpError(500, 'OBSERVATION_FAILED', error instanceof Error ? error.message : String(error));
  }
});

v1Router.add('POST', '/api/v1/analyze', async (req, _reply, _params, body, _query, ctx) => {
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
      const workflow = await runAnalysisWorkflow({
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
      }, {
        loadCase: (id) => ctx.universeStore.getCase(id),
        listEvidence: (id) => ctx.universeStore.listCaseEvidence(id),
        analyze: async ({ text: analysisText, options: analysisOptions, semanticObservation }) => semanticObservation
          ? buildAiAnalysis(analysisText, analysisOptions)
          : analyzeWithProvider(analysisText, { ...analysisOptions, provider: ctx.semanticProvider }),
        composeReminder: (seed) => composeReminderBundle(seed),
        saveCase: ({ aggregate, eventType, actorId: savedBy }) => ctx.universeStore.saveCase(aggregate, eventType, savedBy),
        commitWitness: (input) => ctx.witness.commitMizan(input),
      });
      return { statusCode: 200, body: { id: caseId, kind: 'ANALYSIS', status: 'PERSISTED', persisted: { entityId: caseId, version: workflow.aggregate.version, actorId }, witness: workflow.witness, ...workflow.analysis } };
    });
  } catch (error) {
    return idempotencyError(error) ?? httpError(500, 'ANALYSIS_FAILED', error instanceof Error ? error.message : String(error));
  }
});

v1Router.add('POST', '/api/v1/evaluate', async (req, _reply, _params, body, _query, ctx) => {
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
    const workflow = await runEvaluationWorkflow({
      evaluationId,
      actorId,
      eventId,
      text,
      options,
      semanticObservation: isRecord(p.semanticObservation) ? p.semanticObservation : undefined,
      modelVersion: '4.32.0',
      source: '/api/v1/evaluate',
    }, {
      listEvidence: (id) => ctx.universeStore.listCaseEvidence(id),
      analyze: async ({ text: analysisText, options: analysisOptions, semanticObservation }) => semanticObservation
        ? buildAiAnalysis(analysisText, analysisOptions)
        : analyzeWithProvider(analysisText, { ...analysisOptions, provider: ctx.semanticProvider }),
      appendEvent: (event) => ctx.universeStore.persistence.asActor(actorId).appendEvent(event),
      commitWitness: (witness) => ctx.witness.commitMizan(witness),
    });
    return workflow;
  } catch (error) {
    const code = error instanceof Error ? (error as Error & { code?: unknown }).code : undefined;
    if (code === 'INVALID_ANALYSIS_CONTRACT') return httpError(500, 'INVALID_ANALYSIS_CONTRACT', error instanceof Error ? error.message : String(error));
    if (code === 'WITNESS_ROOT_MISSING') return httpError(500, 'EVALUATION_PERSISTENCE_FAILED', error instanceof Error ? error.message : String(error));
    return httpError(500, 'EVALUATION_PERSISTENCE_FAILED', error instanceof Error ? error.message : String(error));
  }
});

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

v1Router.add('GET', '/api/v1/flow/workflows', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  if (!authz.user?.rid) return httpError(403, 'RID_REQUIRED');
  const workflows = (await ctx.universeStore.persistence.entities().list('FLOW_WORKFLOW')).filter((entity: any) => isRecord(entity.payload) && entity.payload.ownerRid === authz.user!.rid).map((entity: any) => ({ id: entity.id, ...entity.payload, version: entity.version ?? entity.payload.version ?? 1 }));
  return { workflows };
});

v1Router.add('POST', '/api/v1/flow/workflows', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  if (!authz.user?.rid) return httpError(403, 'RID_REQUIRED');
  const p = isRecord(body) ? body : {};
  const name = typeof p.name === 'string' ? p.name.trim().slice(0, 120) : '';
  if (!name) return httpError(400, 'FLOW_NAME_REQUIRED');
  const nodes = [
    { id: 'trigger', kind: 'EVENT', label: 'Evidence attached' },
    { id: 'verify', kind: 'POLICY', label: 'Verify provenance' },
    { id: 'review', kind: 'HUMAN_REVIEW', label: 'Human approval required' },
    { id: 'witness', kind: 'WITNESS', label: 'Hash-only commitment' },
  ];
  const actorId = authz.user.userId;
  try {
    return await ctx.idempotency.execute(scopedIdempotencyKey(req, actorId, 'FLOW_CREATE'), IdempotencyStore.hash({ name }), async () => {
      const id = `FLOW-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const payload = { id, ownerRid: authz.user.rid, name, version: 1, status: 'DRAFT', nodes, edges: [['trigger', 'verify'], ['verify', 'review'], ['review', 'witness']], reviewGate: { decision: 'REVIEW_REQUIRED', requiresHumanReview: true, adverseActionBlocked: true }, witness: { state: 'PENDING' }, updatedAt: now };
      await ctx.universeStore.persistence.asActor(actorId).saveEntity({ id, type: 'FLOW_WORKFLOW', version: 1, payload });
      await ctx.universeStore.persistence.asActor(actorId).appendEvent({ eventId: `EVT-${id}-CREATED`, entityId: id, eventType: 'FLOW.CREATED', payload: { name, version: 1 }, actorId });
      return { statusCode: 201, body: payload };
    });
  } catch (error) {
    return idempotencyError(error) ?? httpError(500, 'FLOW_CREATE_FAILED');
  }
});

v1Router.add('POST', '/api/v1/flow/workflows/:id/request-review', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  const scope = await requireScopedEntity(req, ctx, params.id, { allowOversight: false });
  if (!scope.ok) return scope.error;
  if (scope.entity.type !== 'FLOW_WORKFLOW') return httpError(404, 'FLOW_NOT_FOUND');
  const actorId = scope.user.userId;
  const scopedDefinition = isRecord(scope.entity.payload) ? scope.entity.payload : {};
  const scopedDefinitionHash = sha256({ nodes: scopedDefinition.nodes, edges: scopedDefinition.edges });
  const requestKey = `${actorId}:FLOW_REVIEW:${params.id}:${scopedDefinitionHash}`;
  try {
    return await ctx.idempotency.execute(requestKey, IdempotencyStore.hash({ workflowId: params.id, definitionHash: scopedDefinitionHash }), async () => {
      const latest = await ctx.universeStore.persistence.entities().get(params.id);
      if (!latest || latest.type !== 'FLOW_WORKFLOW') return { statusCode: 404, body: { error: 'FLOW_NOT_FOUND' } };
      const current = isRecord(latest.payload) ? latest.payload : {};
      const reviews = await ctx.universeStore.persistence.entities().list('HUMAN_REVIEW');
      const reviewForTarget = () => reviews.find((entity: any) => isRecord(entity.payload) && entity.payload.targetId === params.id);
      if (current.status === 'REVIEW_REQUIRED') {
        const witness = isRecord(current.witness) ? current.witness : {};
        const reviewRef = isRecord(current.reviewRef) ? current.reviewRef : {};
        const reviewEntity = typeof reviewRef.reviewId === 'string'
          ? reviews.find((entity: any) => entity.id === reviewRef.reviewId)
          : reviewForTarget();
        const reviewPayload = isRecord(reviewEntity?.payload) ? reviewEntity.payload : {};
        const witnessNode = typeof witness.nodeId === 'string'
          ? ctx.witness.dag.getById(witness.nodeId)
          : typeof witness.hash === 'string' ? ctx.witness.dag.get(witness.hash) : null;
        if (reviewEntity && typeof witness.hash === 'string' && typeof witness.root === 'string' && witnessNode) {
          return { statusCode: 200, body: {
            workflow: current,
            review: { reviewId: reviewEntity.id, status: reviewPayload.status },
            witness: { nodeId: witnessNode.nodeId, hash: witness.hash, root: witness.root, checkpointId: witness.checkpointId ?? null },
          } };
        }
        return { statusCode: 409, body: { error: 'FLOW_REVIEW_STATE_INCOMPLETE' } };
      }

      let requestVersion: number;
      let definitionHash: string;
      let review: any;
      let pendingPayload: Record<string, unknown>;
      const pendingReview = isRecord(current.pendingReview) ? current.pendingReview : null;
      if (current.status === 'WITNESS_PENDING' && pendingReview) {
        requestVersion = Number(pendingReview.requestVersion);
        definitionHash = typeof pendingReview.definitionHash === 'string' ? pendingReview.definitionHash : '';
        const reviewId = typeof pendingReview.reviewId === 'string' ? pendingReview.reviewId : '';
        const reviewEntity = reviewId ? await ctx.universeStore.persistence.entities().get(reviewId) : null;
        if (!Number.isInteger(requestVersion) || requestVersion < 1 || !definitionHash || !reviewEntity || reviewEntity.type !== 'HUMAN_REVIEW' || !isRecord(reviewEntity.payload)) {
          throw new Error('FLOW_PENDING_REVIEW_INVALID');
        }
        review = reviewEntity.payload;
        pendingPayload = current;
      } else {
        requestVersion = Number(latest.version ?? current.version ?? 1) + 1;
        definitionHash = sha256({ id: params.id, version: requestVersion, nodes: current.nodes, edges: current.edges });
        review = createReview({ targetId: params.id, requestedBy: actorId, assigneeId: null, gateDecision: 'REQUIRE_HUMAN_REVIEW', evidenceRefs: [definitionHash] });
        pendingPayload = {
          ...current,
          version: requestVersion,
          status: 'WITNESS_PENDING',
          reviewGate: { decision: 'REVIEW_REQUIRED', requiresHumanReview: true, adverseActionBlocked: true },
          witness: { state: 'PENDING' },
          pendingReview: { reviewId: review.reviewId, requestVersion, definitionHash },
          updatedAt: new Date().toISOString(),
        };
        if (!ctx.universeStore.persistence.store.batch) throw new Error('TRANSACTION_NOT_SUPPORTED');
        await ctx.universeStore.persistence.store.batch(async () => {
          const actor = ctx.universeStore.persistence.asActor(actorId);
          await actor.saveEntity({ id: params.id, type: 'FLOW_WORKFLOW', expectedVersion: Number(latest.version ?? 1), version: requestVersion, payload: pendingPayload });
          await actor.saveEntity({ id: review.reviewId, type: 'HUMAN_REVIEW', version: review.version, payload: review });
          await actor.appendEvent({ eventId: `EVT-${params.id}-REVIEW-INTENT-${requestVersion}`, entityId: params.id, eventType: 'FLOW.REVIEW.INTENT_RECORDED', payload: { version: requestVersion, definitionHash, reviewId: review.reviewId }, actorId });
        });
      }

      const nodeId = `FLOW-${params.id}-V${requestVersion}`;
      const existingNode = ctx.witness.dag.getById(nodeId);
      const committed = existingNode
        ? { node: existingNode, root: ctx.witness.dag.root(), checkpoint: null }
        : await ctx.witness.commit({ nodeId, kind: 'FLOW.REVIEW.REQUESTED', payload: { protocol: 'MW_FLOW_WITNESS_V1', workflowId: params.id, workflowVersion: requestVersion, definitionHash, action: 'REQUEST_HUMAN_REVIEW' }, actorId });

      const finalVersion = requestVersion + 1;
      const { pendingReview: _pendingReview, ...withoutPending } = pendingPayload;
      const payload = { ...withoutPending, version: finalVersion, status: 'REVIEW_REQUIRED', reviewRef: { reviewId: review.reviewId }, witness: { state: 'VALID', nodeId: committed.node.nodeId, hash: committed.node.hash, root: committed.root, checkpointId: committed.checkpoint?.checkpointId ?? null }, updatedAt: new Date().toISOString() };
      await ctx.universeStore.persistence.store.batch(async () => {
        const actor = ctx.universeStore.persistence.asActor(actorId);
        await actor.saveEntity({ id: params.id, type: 'FLOW_WORKFLOW', expectedVersion: requestVersion, version: finalVersion, payload });
        await actor.appendEvent({ eventId: `EVT-${params.id}-REVIEW-COMMITTED-${finalVersion}`, entityId: params.id, eventType: 'FLOW.REVIEW.WITNESSED', payload: { requestVersion, finalVersion, definitionHash, witnessHash: committed.node.hash, reviewId: review.reviewId }, actorId });
      });
      return { statusCode: 200, body: { workflow: payload, review: { reviewId: review.reviewId, status: review.status }, witness: { nodeId: committed.node.nodeId, hash: committed.node.hash, root: committed.root, checkpointId: committed.checkpoint?.checkpointId ?? null } } };
    });
  } catch (error) {
    return idempotencyError(error) ?? httpError(500, 'FLOW_REVIEW_REQUEST_FAILED');
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

v1Router.add('POST', '/api/v1/reviews', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE'); if (!authz.ok) return authz.error;
  const p=isRecord(body)?body:{}; if(typeof p.targetId!=='string'||!p.targetId) return httpError(400,'REVIEW_TARGET_REQUIRED');
  if (await ctx.universeStore.persistence.entities().get(p.targetId)) {
    const scope = await requireScopedEntity(req, ctx, p.targetId);
    if (!scope.ok) return scope.error;
  }
  const actor=authz.user?.userId??'SERVICE-API-001';
  try {
    const review = await runCreateReviewWorkflow({ targetId: p.targetId, requestedBy: actor, actorId: actor, assigneeId: typeof p.assigneeId === 'string' ? p.assigneeId : null, gateDecision: typeof p.gateDecision === 'string' ? p.gateDecision : 'REQUIRE_HUMAN_REVIEW', evidenceRefs: Array.isArray(p.evidenceRefs) ? p.evidenceRefs.filter((x): x is string => typeof x === 'string') : [] }, {
      createReview,
      saveEntity: (input) => ctx.universeStore.persistence.asActor(actor).saveEntity(input),
      appendEvent: (input) => ctx.universeStore.persistence.asActor(actor).appendEvent(input),
    });
    return {statusCode:201,body:review};
  } catch (error) {
    return httpError(409, 'REVIEW_CREATE_REJECTED', error instanceof Error ? error.message : String(error));
  }
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
    return await runTransitionReviewWorkflow({ current: current.payload as ReviewRecord, currentVersion: Number(current.version ?? currentPayload.version ?? 1), transition: { status: p.status as ReviewStatus, actorId: actor, rationale: typeof p.rationale === 'string' ? p.rationale : undefined, disposition: typeof p.disposition === 'string' ? p.disposition as HumanDisposition : undefined, assigneeId } }, {
      transitionReview,
      saveEntity: (input) => ctx.universeStore.persistence.asActor(actor).saveEntity(input),
      appendEvent: (input) => ctx.universeStore.persistence.asActor(actor).appendEvent(input),
    });
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

v1Router.add('POST', '/api/v1/resource/:id/evidence', async (req, _reply, params, body, _query, ctx) => {
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
    return await runEvidenceWorkflow({
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
    }, {
      listEvidence: (id) => ctx.universeStore.listCaseEvidence(id),
      saveEvidence: (record) => ctx.universeStore.persistence.asActor(actorId).saveEvidence(record) as Promise<typeof record>,
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
