import { Router, httpError, isRecord, requireAuthenticated, requirePermission } from '../compat/router.js';
import {
  AwsLegalStore,
  AwsObservabilityService,
  AwsQueryService,
  AwsResearchOperatorService,
} from '@moonwitness/orchestrator';

export const awsRouter = new Router();

function services(ctx: any) {
  const store = new AwsLegalStore(ctx.universeStore.persistence.store);
  return {
    store,
    query: new AwsQueryService(store),
    observability: new AwsObservabilityService(store, ctx.jobs),
    operator: new AwsResearchOperatorService(store, ctx.jobs),
  };
}

awsRouter.add('GET', '/api/v1/aws/cases/:id', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  const result = await services(ctx).query.getCase(params.id);
  return result ?? httpError(404, 'AWS_CASE_NOT_FOUND');
});

awsRouter.add('GET', '/api/v1/aws/cases/:id/graph', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  const result = await services(ctx).query.getCaseGraph(params.id);
  return result ?? httpError(404, 'AWS_CASE_NOT_FOUND');
});

awsRouter.add('GET', '/api/v1/aws/cases/:id/history', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  const result = await services(ctx).query.getCaseHistory(params.id);
  return result ?? httpError(404, 'AWS_CASE_NOT_FOUND');
});

awsRouter.add('GET', '/api/v1/aws/sources', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  return { sources: await services(ctx).query.listSources() };
});

awsRouter.add('GET', '/api/v1/aws/sources/:id/revisions', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  const result = await services(ctx).query.listSourceRevisions(params.id);
  return result ?? httpError(404, 'AWS_SOURCE_NOT_FOUND');
});

awsRouter.add('GET', '/api/v1/aws/research/runs', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  return { runs: await services(ctx).query.listResearchRuns() };
});

awsRouter.add('GET', '/api/v1/aws/research/reviews', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  return { reviews: await services(ctx).query.listResearchReviews() };
});

awsRouter.add('GET', '/api/v1/aws/observability', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  return services(ctx).observability.snapshot();
});

awsRouter.add('POST', '/api/v1/aws/research/reanalyze', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'COMMAND');
  if (!authz.ok) return authz.error;
  const input = isRecord(body) ? body : {};
  const caseId = typeof input.caseId === 'string' ? input.caseId.trim() : '';
  const sourceId = typeof input.sourceId === 'string' ? input.sourceId.trim() : '';
  if (!caseId) return httpError(400, 'AWS_CASE_ID_REQUIRED');
  if (!sourceId) return httpError(400, 'AWS_SOURCE_ID_REQUIRED');
  try {
    const result = await services(ctx).operator.requestReanalysis({
      caseId,
      sourceId,
      requestedBy: authz.user.userId,
    });
    return { statusCode: 202, body: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('AWS_OPERATOR_CASE_NOT_FOUND:')) return httpError(404, 'AWS_CASE_NOT_FOUND');
    if (message.startsWith('AWS_OPERATOR_SOURCE_NOT_FOUND:')) return httpError(404, 'AWS_SOURCE_NOT_FOUND');
    if (message.startsWith('AWS_OPERATOR_SOURCE_REVISION_MISSING:')) return httpError(409, 'AWS_SOURCE_REVISION_MISSING');
    if (message.startsWith('AWS_OPERATOR_CASE_NOT_DEPENDENT_ON_SOURCE:')) return httpError(409, 'AWS_CASE_SOURCE_DEPENDENCY_REQUIRED');
    return httpError(500, 'AWS_REANALYSIS_REQUEST_FAILED');
  }
});
