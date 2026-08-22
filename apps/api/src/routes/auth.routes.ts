import { Router, isRecord, httpError, requirePermission } from '../router.js';

export const authRouter = new Router();

authRouter.add('POST', '/api/v1/auth/register', async (_req, _reply, _params, body, _query, ctx) => {
  const payload = isRecord(body) ? body : {};
  const username = typeof payload.username === 'string' ? payload.username : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!username || !password) return httpError(400, 'USERNAME_PASSWORD_REQUIRED');
  if (password.length < 8) return httpError(400, 'PASSWORD_TOO_SHORT');
  try {
    return { statusCode: 201, body: await ctx.auth.createUser({ username, password, rid: typeof payload.rid === 'string' ? payload.rid : undefined, roles: ['USER'] }) };
  } catch (error) {
    return { statusCode: 409, body: { error: 'USER_EXISTS', message: error instanceof Error ? error.message : String(error) } };
  }
});

authRouter.add('POST', '/api/v1/auth/login', async (_req, _reply, _params, body, _query, ctx) => {
  const payload = isRecord(body) ? body : {};
  const result = await ctx.auth.login(String(payload.username ?? ''), String(payload.password ?? ''));
  return result ?? httpError(401, 'INVALID_CREDENTIALS');
});

authRouter.add('POST', '/api/v1/auth/provision', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'ADMIN');
  if (!authz.ok) return authz.error;
  const payload = isRecord(body) ? body : {};
  const username = typeof payload.username === 'string' ? payload.username : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!username || !password || password.length < 12) return httpError(400, 'INVALID_PROVISIONING_PAYLOAD');
  const roles = Array.isArray(payload.roles) ? payload.roles.filter((value): value is string => typeof value === 'string') : ['USER'];
  try {
    return { statusCode: 201, body: await ctx.auth.createUser({ username, password, rid: typeof payload.rid === 'string' ? payload.rid : undefined, roles }) };
  } catch (error) {
    return httpError(409, 'USER_EXISTS', error instanceof Error ? error.message : String(error));
  }
});

authRouter.add('POST', '/api/v1/auth/logout', async (req, _reply, _params, _body, _query, ctx) => {
  const token = req.headers.authorization?.slice(7) ?? '';
  if (!token) return httpError(401, 'UNAUTHORIZED');
  return { ok: await ctx.auth.logout(token) };
});

authRouter.add('GET', '/api/v1/auth/me', async (req, _reply, _params, _body, _query, ctx) => {
  const token = req.headers.authorization?.slice(7) ?? '';
  const user = await ctx.auth.authenticate(token);
  return user ?? httpError(401, 'UNAUTHORIZED');
});

authRouter.add('GET', '/api/v1/auth/online', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'ADMIN');
  if (!authz.ok) return authz.error;
  return { online: ctx.auth.getOnlineUsers() };
});
