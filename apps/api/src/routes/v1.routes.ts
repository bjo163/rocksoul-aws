import { Router, isRecord, httpError, requirePermission, idempotencyKey, bearerToken } from '../router.js';
import { buildAiAnalysis, analyzeWithProvider } from '../../../../src/ai/general-analyzer.js';
import { IdempotencyStore } from '../../../../src/persistence/idempotency.js';
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
import { assertHumanReviewGate } from '../../../../src/contracts/runtime-validation.js';
import { createReview, transitionReview, type ReviewRecord } from '../../../../src/review/workflow.js';

export const v1Router = new Router();

function evidenceObservation(evidence: any[]): any[] {
  return evidence.map((item) => ({
    ...(item?.payload && typeof item.payload === 'object' ? item.payload : {}),
    id: item.evidenceId,
    status: item.status ?? 'UNKNOWN',
    type: item.sourceType,
    reference: item.reference,
    confidence: item.confidence,
  }));
}

v1Router.add('GET', '/api/v1/observability/recent', async (req, _reply, _params, _body, query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  return ctx.observability.recent(Number(query.get('limit') ?? 100));
});

v1Router.add('GET', '/api/v1/stream', async (req, reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;

  reply.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  reply.write('data: {"status": "connected"}\n\n');

  const onTrace = (trace: any) => {
    reply.write(`event: trace\ndata: ${JSON.stringify(trace)}\n\n`);
  };

  const heartbeat = setInterval(() => {
    reply.write(`event: heartbeat\ndata: {"online": ${JSON.stringify(ctx.auth.getOnlineUsers())}}\n\n`);
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
  return {
    uptime: process.uptime(),
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
    },
    onlineUsers: ctx.auth.getOnlineUsers().length,
    traces: ctx.observability.recent(10).length // lightweight check
  };
});

v1Router.add('GET', '/api/v1/semantic/registry', async (_req, _reply, _params, _body, _query, ctx) => ctx.semanticRegistry.snapshot());

v1Router.add('GET', '/api/v1/revelation/core', async (_req, _reply, _params, _body, _query, _ctx) => revelationSemanticCoreSnapshot(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/geography', async (_req, _reply, _params, _body, _query, _ctx) => revelationGeographyReport(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/asma', async (_req, _reply, _params, _body, _query, _ctx) => asmaEngineSnapshot(process.cwd()));
v1Router.add('GET', '/api/v1/revelation/divine-ontology', async (_req, _reply, _params, _body, _query, _ctx) => divineOntologySnapshot(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/moral-graph', async (_req, _reply, _params, _body, _query, _ctx) => revelationMoralGraph(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/corpora', async (_req, _reply, _params, _body, _query, _ctx) => fourBookCorpusSnapshot(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/lifecycle', async (_req, _reply, _params, _body, _query, _ctx) => revelationLifecycleSnapshot(process.cwd()));

v1Router.add('GET', '/api/v1/revelation/grammar', async (_req, _reply, _params, _body, _query, _ctx) => revelationGrammarSnapshot(process.cwd()));

v1Router.add('GET', '/api/v1/jobs/:id', async (_req, _reply, params, _body, _query, ctx) => 
  await ctx.jobs.get(params.id) ?? httpError(404, 'JOB_NOT_FOUND')
);

v1Router.add('POST', '/api/v1/jobs/process', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'COMMAND');
  if (!authz.ok) return authz.error;
  return { statusCode: 202, body: { processed: await ctx.jobs.processAvailable(8) } };
});

v1Router.add('POST', '/api/v1/observe', async (req, _reply, _params, body, _query, ctx) => {
  try {
    const p = isRecord(body) ? body : {};
    const payload = isRecord(p.payload) ? p.payload : p;
    let entityId = typeof p.entityId === 'string' ? p.entityId : 'UNBOUND';
    if (entityId === 'UNBOUND') entityId = `OBS-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const actorId = ctx.auth.authenticate(bearerToken(req))?.userId ?? 'SERVICE-API-001';
    const scoped = ctx.universeStore.persistence.asActor(actorId);
    if (!ctx.universeStore.persistence.store.batch) throw new Error('TRANSACTION_NOT_SUPPORTED');
    await ctx.universeStore.persistence.store.batch(async () => {
      await scoped.saveEntity({id: entityId, type: 'CASE', version: 1, payload: {id: entityId, type: 'CASE', version: 1, status: 'OBSERVED', observation: {source: typeof p.source === 'string' ? p.source : 'API', payload}, updatedAt: new Date().toISOString()}});
    });
    const persisted = await scoped.appendEvent({eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, entityId, eventType: 'OBSERVATION', payload: {observation: payload, context: isRecord(p.context) ? p.context : {}, source: typeof p.source === 'string' ? p.source : 'API'}, actorId});
    return { id: persisted.eventId, kind: 'OBSERVATION', status: 'RECORDED', event: persisted, entityId };
  } catch(error) {
    return httpError(500, 'OBSERVATION_FAILED', error instanceof Error ? error.message : String(error));
  }
});

v1Router.add('POST', '/api/v1/analyze', async (req, _reply, _params, body, _query, ctx) => {
  const p = isRecord(body) ? body : {};
  const caseId = typeof p.caseId === 'string' && p.caseId ? p.caseId : `CASE-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const existing = await ctx.universeStore.getCase(caseId);
  const persistedEvidence = await ctx.universeStore.listCaseEvidence(caseId);
  const observation = isRecord(p.observation) ? p.observation : {};
  const text = typeof observation.text === 'string' ? observation.text : (typeof p.text === 'string' ? p.text : '');
  if (!text) return httpError(400, 'TEXT_REQUIRED');
  const options = isRecord(p.options) ? { ...p.options } : {};
  if (isRecord(p.semanticObservation)) options.semanticObservation = p.semanticObservation;
  options.persistedEvidence = evidenceObservation(persistedEvidence);
  const analysis = isRecord(options.semanticObservation) ? buildAiAnalysis(text, options) : await analyzeWithProvider(text, { ...options, provider: ctx.semanticProvider });
  const reminderBundle = p.includeReminder === true ? await composeReminderBundle(typeof p.reminderSeed === 'number' ? p.reminderSeed : undefined) : null;
  const finalAnalysis = reminderBundle ? { ...analysis, reminderBundle } : analysis;
  const actorId = ctx.auth.authenticate(bearerToken(req))?.userId ?? 'SERVICE-API-001';
  const aggregate = { id: caseId, type: 'CASE', version: Number(existing?.version ?? 0) + 1, status: 'ANALYZED', observation: { text }, analysis: finalAnalysis, lifecycle: (finalAnalysis as any).lifecycle ?? null, updatedAt: new Date().toISOString() } as any;
  await ctx.universeStore.saveCase(aggregate, 'CASE.ANALYZED', actorId);
  const witness=await ctx.witness.commitMizan({ recordId:`${caseId}:v${aggregate.version}`, recordType:'ANALYSIS', actorId, text, mizan:(finalAnalysis as any).mizan ?? null, semantic:(finalAnalysis as any).semanticVector ?? (finalAnalysis as any).semantic ?? null, lifecycle:{caseLifecycle:(finalAnalysis as any).lifecycle ?? null,moralLifecycle:(finalAnalysis as any).moralLifecycle ?? null}, reviewGate:(finalAnalysis as any).reviewGate ?? null, modelVersion:'4.32.0', source:'/api/v1/analyze' });
  return { id: caseId, kind: 'ANALYSIS', status: 'PERSISTED', persisted: { entityId: caseId, version: aggregate.version, actorId }, witness:{ nodeId:witness.node.nodeId, hash:witness.node.hash, root:witness.root, checkpointId:witness.checkpoint?.checkpoint.checkpointId ?? null }, ...finalAnalysis };
});

v1Router.add('POST', '/api/v1/evaluate', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE');
  if (!authz.ok) return authz.error;
  const p = isRecord(body) ? body : {};
  const input = isRecord(p.input) ? p.input : {};
  const evaluationId = typeof p.target === 'string' && p.target ? p.target : `EVAL-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const persistedEvidence = await ctx.universeStore.listCaseEvidence(evaluationId);
  const text = typeof input.text === 'string' ? input.text : (typeof p.text === 'string' ? p.text : '');
  if (!text) return httpError(400, 'TEXT_REQUIRED');
  const options = isRecord(input.options) ? { ...input.options } : {};
  if (p.semanticObservation) options.semanticObservation = p.semanticObservation;
  options.persistedEvidence = evidenceObservation(persistedEvidence);
  const analysis = isRecord(options.semanticObservation) ? buildAiAnalysis(text, options) : await analyzeWithProvider(text, { ...options, provider: ctx.semanticProvider });
  const actorId=authz.user?.userId ?? 'SERVICE-API-001';
  const eventId=`EVT-MIZAN-${evaluationId}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  try {
    await ctx.universeStore.persistence.asActor(actorId).appendEvent({
      eventId, entityId: typeof p.target === 'string' && p.target ? p.target : evaluationId, eventType: 'MIZAN.EVALUATION', payload: { evaluationId, mizan: (analysis as any).mizan ?? null, semantic: (analysis as any).semanticVector ?? (analysis as any).semantic ?? null, lifecycle: (analysis as any).lifecycle ?? null, reviewGate: (analysis as any).reviewGate ?? null, revelationScorecard: (analysis as any).revelationScorecard ?? null }, actorId
    });
  } catch (error) {
    return httpError(500, 'EVALUATION_PERSISTENCE_FAILED', error instanceof Error ? error.message : String(error));
  }
  const witness=await ctx.witness.commitMizan({ recordId:eventId, recordType:'EVALUATION', actorId, text, mizan:(analysis as any).mizan ?? null, semantic:(analysis as any).semanticVector ?? (analysis as any).semantic ?? null, lifecycle:{caseLifecycle:(analysis as any).lifecycle ?? null,moralLifecycle:(analysis as any).moralLifecycle ?? null}, reviewGate:(analysis as any).reviewGate ?? null, modelVersion:'4.32.0', source:'/api/v1/evaluate' });
  const reviewGate=(analysis as any).reviewGate ?? null;
  try { assertHumanReviewGate(reviewGate); } catch (error) { return httpError(500, 'INVALID_ANALYSIS_CONTRACT', error instanceof Error ? error.message : String(error)); }
  const status=reviewGate?.decision === 'BLOCK_ADVERSE_ACTION' ? 'BLOCKED' : reviewGate?.requiresHumanReview ? 'REVIEW_REQUIRED' : 'RESOLVED';
  return { id: evaluationId, kind: 'EVALUATION', status, witness:{ nodeId:witness.node.nodeId, hash:witness.node.hash, root:witness.root, checkpointId:witness.checkpoint?.checkpoint.checkpointId ?? null }, mizan: (analysis as any).mizan ?? null, semantic: (analysis as any).semanticVector ?? (analysis as any).semantic ?? null, lifecycle: (analysis as any).lifecycle ?? null, reviewGate, revelationScorecard: (analysis as any).revelationScorecard ?? null };
});

v1Router.add('POST', '/api/v1/query', async (_req, _reply, _params, body, query, ctx) => {
  const p = isRecord(body) ? body : {};
  const q = typeof p.query === 'string' ? p.query : query.get('q') ?? undefined;
  const type = typeof p.type === 'string' ? p.type : query.get('type') ?? undefined;
  const entityId = typeof p.entityId === 'string' ? p.entityId : query.get('entityId') ?? undefined;
  const n = Number(p.limit ?? query.get('limit') ?? 50);
  const limit = Number.isFinite(n) ? Math.max(1, Math.min(250, n)) : 50;
  const offset = Math.max(0, Number(query.get('offset')) || 0);
  if (entityId) return { type: 'ENTITY', result: ctx.backend.runtime.graph.getEntity(entityId) ?? null };
  return { type: 'ENTITIES', results: ctx.backend.runtime.graph.listEntities({ type, q }).slice(offset, offset + limit) };
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
  
  const key = idempotencyKey(req);
  try {
    return await ctx.idempotency.execute(key, IdempotencyStore.hash(p), async () => {
      switch(command) {
        case 'CREATE_ENTITY': { const id = p.target || (typeof data.id === 'string' ? data.id : `ENT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`); const entity = await ctx.universeStore.persistence.asActor(authz.user?.userId ?? 'SERVICE-API-001').saveEntity({id, type: typeof data.type === 'string' ? data.type : 'ENTITY', payload: isRecord(data.payload) ? data.payload : data}); return {statusCode: 201, body: entity}; }
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
  return { id: params.id, audit: await ctx.universeStore.auditHistory(params.id), integrity: await ctx.universeStore.verifyAudit() };
});

v1Router.add('GET', '/api/v1/resource/:id/replay', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  const events = await ctx.universeStore.listCaseEvents(params.id);
  return { id: params.id, replay: replayCaseEvents(events, params.id), ledger: await ctx.universeStore.verifyLedger() };
});

v1Router.add('GET', '/api/v1/resource/:id', async (_req, _reply, params, _body, _query, ctx) => {
  const id = params.id;
  const persisted = await ctx.universeStore.getCase(id);
  if (persisted) return { id, kind: 'RESOURCE', entity: persisted, events: await ctx.universeStore.listCaseEvents(id), evidence: await ctx.universeStore.listCaseEvidence(id), graph: ctx.backend.app.graph(id) ?? null };
  const entity = ctx.backend.runtime.graph.getEntity(id);
  if (!entity) return httpError(404, 'RESOURCE_NOT_FOUND');
  return { id, kind: 'RESOURCE', entity, graph: ctx.backend.app.graph(id) ?? null };
});

v1Router.add('GET', '/api/v1/reviews', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE'); if (!authz.ok) return authz.error;
  return { reviews: await ctx.universeStore.persistence.entities().list('HUMAN_REVIEW') };
});

v1Router.add('POST', '/api/v1/reviews', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE'); if (!authz.ok) return authz.error;
  const p=isRecord(body)?body:{}; if(typeof p.targetId!=='string'||!p.targetId) return httpError(400,'REVIEW_TARGET_REQUIRED');
  const actor=authz.user?.userId??'SERVICE-API-001'; const review=createReview({targetId:p.targetId,requestedBy:actor,assigneeId:typeof p.assigneeId==='string'?p.assigneeId:null,gateDecision:typeof p.gateDecision==='string'?p.gateDecision:'REQUIRE_HUMAN_REVIEW',evidenceRefs:Array.isArray(p.evidenceRefs)?p.evidenceRefs.filter((x):x is string=>typeof x==='string'):[]});
  await ctx.universeStore.persistence.asActor(actor).saveEntity({id:review.reviewId,type:'HUMAN_REVIEW',version:review.version,payload:review});
  await ctx.universeStore.persistence.asActor(actor).appendEvent({eventId:`EVT-${review.reviewId}-CREATED`,entityId:review.targetId,eventType:'HUMAN_REVIEW.CREATED',payload:review,actorId:actor});
  return {statusCode:201,body:review};
});

v1Router.add('POST', '/api/v1/reviews/:id/transition', async (req, _reply, params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE'); if (!authz.ok) return authz.error;
  const current=await ctx.universeStore.persistence.entities().get(params.id); if(!current||current.type!=='HUMAN_REVIEW') return httpError(404,'REVIEW_NOT_FOUND');
  const p=isRecord(body)?body:{}; const actor=authz.user?.userId??'SERVICE-API-001'; if(typeof p.status!=='string') return httpError(400,'REVIEW_STATUS_REQUIRED');
  try { const next=transitionReview(current.payload as ReviewRecord,{status:p.status as any,actorId:actor,rationale:typeof p.rationale==='string'?p.rationale:undefined,disposition:typeof p.disposition==='string'?p.disposition as any:undefined,assigneeId:typeof p.assigneeId==='string'?p.assigneeId:undefined}); await ctx.universeStore.persistence.asActor(actor).saveEntity({id:next.reviewId,type:'HUMAN_REVIEW',version:next.version,payload:next}); await ctx.universeStore.persistence.asActor(actor).appendEvent({eventId:`EVT-${next.reviewId}-${next.version}`,entityId:next.targetId,eventType:'HUMAN_REVIEW.TRANSITIONED',payload:next,actorId:actor}); return next; } catch(error) { return httpError(409,'REVIEW_TRANSITION_REJECTED',error instanceof Error?error.message:String(error)); }
});

v1Router.add('GET', '/api/v1/resource/:id/evidence', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE');
  if (!authz.ok) return authz.error;
  if (!(await ctx.universeStore.getCase(params.id))) return httpError(404, 'RESOURCE_NOT_FOUND');
  const evidence=await ctx.universeStore.listCaseEvidence(params.id);
  const supersededBy=new Map<string,string>();
  for(const item of evidence){const prior=isRecord(item.payload)&&typeof item.payload.supersedes==='string'?item.payload.supersedes:null;if(prior)supersededBy.set(prior,item.evidenceId);}
  return { id: params.id, evidence: evidence.map((item:any)=>({...item,supersedes:isRecord(item.payload)&&typeof item.payload.supersedes==='string'?item.payload.supersedes:undefined,supersededBy:supersededBy.get(item.evidenceId)})) };
});

v1Router.add('POST', '/api/v1/resource/:id/evidence', async (req, _reply, params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'EVALUATE');
  if (!authz.ok) return authz.error;
  const existing = await ctx.universeStore.getCase(params.id);
  if (!existing) return httpError(404, 'RESOURCE_NOT_FOUND');
  const p = isRecord(body) ? body : {};
  const status = typeof p.status === 'string' ? p.status.toUpperCase() : 'UNKNOWN';
  const allowed = new Set(['OBSERVED', 'SUPPORTED', 'VERIFIED', 'CORROBORATED', 'INFERRED', 'UNKNOWN', 'CONFLICTED']);
  if (!allowed.has(status)) return httpError(400, 'INVALID_EVIDENCE_STATUS');
  const payload = isRecord(p.payload) ? p.payload : {};
  const evidenceId = typeof p.evidenceId === 'string' && p.evidenceId ? p.evidenceId : `EVD-${params.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const history=await ctx.universeStore.listCaseEvidence(params.id);
  if(history.some((item:any)=>item.evidenceId===evidenceId)) return httpError(409,'EVIDENCE_IMMUTABLE','Create a new evidenceId and use supersedes instead of updating an existing record.');
  const supersedes=typeof p.supersedes==='string'&&p.supersedes?p.supersedes:undefined;
  if(supersedes){
    if(supersedes===evidenceId) return httpError(400,'EVIDENCE_SELF_SUPERSESSION');
    if(!history.some((item:any)=>item.evidenceId===supersedes)) return httpError(404,'SUPERSEDED_EVIDENCE_NOT_FOUND');
    if(typeof p.supersessionReason!=='string'||!p.supersessionReason.trim()) return httpError(400,'SUPERSESSION_REASON_REQUIRED');
    if(history.some((item:any)=>isRecord(item.payload)&&item.payload.supersedes===supersedes)) return httpError(409,'EVIDENCE_ALREADY_SUPERSEDED');
  }
  const actorId = authz.user?.userId ?? 'SERVICE-API-001';
  const evidence = await ctx.universeStore.persistence.asActor(actorId).saveEvidence({
    evidenceId,
    entityId: params.id,
    sourceType: typeof p.sourceType === 'string' ? p.sourceType : 'USER_SUBMITTED',
    reference: typeof p.reference === 'string' ? p.reference : undefined,
    status: status as any,
    confidence: typeof p.confidence === 'number' ? Math.max(0, Math.min(1, p.confidence)) : undefined,
    payload: { ...payload, submittedThrough: '/api/v1/resource/:id/evidence', supersedes, supersessionReason:supersedes?p.supersessionReason:undefined },
  });
  return { id: params.id, status: 'EVIDENCE_RECORDED', evidence, reanalysisRequired: true };
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
