import { Router, isRecord, httpError, requireAuthenticated, requirePermission } from '../compat/router.js';
import { hasPermission } from '@moonwitness/security';

export const jobsRouter = new Router();

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

jobsRouter.add('GET', '/api/v1/jobs/:id', async (req, _reply, params, _body, _query, ctx) => {
  const authz = await requireAuthenticated(req, ctx.auth);
  if (!authz.ok) return authz.error;
  const job = await ctx.jobs.get(params.id);
  if (!job) return httpError(404, 'JOB_NOT_FOUND');
  const requestedBy = isRecord(job.payload) && typeof job.payload.actorId === 'string' ? job.payload.actorId : null;
  if (requestedBy !== authz.user.userId && !hasPermission(authz.user, 'READ_AUDIT')) return httpError(404, 'JOB_NOT_FOUND');
  return publicJob(job);
});

jobsRouter.add('POST', '/api/v1/jobs/process', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'COMMAND');
  if (!authz.ok) return authz.error;
  return { statusCode: 202, body: { processed: (await ctx.jobs.processAvailable(8)).map(publicJob) } };
});
