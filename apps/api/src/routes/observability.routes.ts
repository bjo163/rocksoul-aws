import { Router, httpError, requirePermission } from '../compat/router.js';
import { boundedInteger } from '../query-bounds.js';

export const observabilityRouter = new Router();

observabilityRouter.add('GET', '/api/v1/observability/recent', async (req, _reply, _params, _body, query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'READ_AUDIT');
  if (!authz.ok) return authz.error;
  const limit = boundedInteger(query.get('limit'), 100, 1, 250);
  if (!limit.ok) return httpError(400, limit.code);
  return ctx.observability.recent(limit.value);
});

observabilityRouter.add('GET', '/api/v1/stream', async (req, reply, _params, _body, _query, ctx) => {
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

observabilityRouter.add('GET', '/api/v1/metrics', async (req, _reply, _params, _body, _query, ctx) => {
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
