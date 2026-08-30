import { Router, isRecord, httpError, requireAuthenticated } from '../compat/router.js';
import { IdempotencyStore } from '@moonwitness/persistence';
import { createReview } from '@moonwitness/orchestrator';
import { requireScopedEntity } from '../access-control.js';
import { sha256 } from '@moonwitness/witness';
import { scopedIdempotencyKey, idempotencyError } from './route-utils.js';

export const workflowRouter = new Router();

workflowRouter.add('GET', '/api/v1/flow/workflows', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  if (!authz.user?.rid) return httpError(403, 'RID_REQUIRED');
  const workflows = (await ctx.universeStore.persistence.entities().list('FLOW_WORKFLOW')).filter((entity: any) => isRecord(entity.payload) && entity.payload.ownerRid === authz.user!.rid).map((entity: any) => ({ id: entity.id, ...entity.payload, version: entity.version ?? entity.payload.version ?? 1 }));
  return { workflows };
});

workflowRouter.add('POST', '/api/v1/flow/workflows', async (req, _reply, _params, body, _query, ctx) => {
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

workflowRouter.add('POST', '/api/v1/flow/workflows/:id/request-review', async (req, _reply, params, _body, _query, ctx) => {
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
