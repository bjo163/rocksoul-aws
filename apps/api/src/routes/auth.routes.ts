import type { IncomingMessage, ServerResponse } from 'node:http';
import { Router, bearerToken, httpError, isRecord, requestCookie, requirePermission } from '../router.js';

export const authRouter = new Router();

async function recordRidBinding(ctx: any, user: any, assignedBy: string, source: string): Promise<void> {
  if (!user?.rid || !user?.userId) return;
  const id = `RID-BINDING-${user.userId}`;
  const existing = await ctx.universeStore.persistence.entities().get(id);
  if (existing) {
    if (isRecord(existing.payload) && existing.payload.rid === user.rid) return;
    throw new Error('RID_BINDING_AUDIT_CONFLICT');
  }
  if (!ctx.universeStore.persistence.store.batch) throw new Error('TRANSACTION_NOT_SUPPORTED');
  await ctx.universeStore.persistence.store.batch(async () => {
    const actor = ctx.universeStore.persistence.asActor(assignedBy);
    const assignedAt = new Date().toISOString();
    await actor.saveEntity({ id, type: 'RID_BINDING', expectedVersion: 0, version: 1, payload: { userId: user.userId, rid: user.rid, assignedBy, assignedAt, source, immutable: true } });
    await actor.appendEvent({ eventId: `EVT-${id}-CREATED`, entityId: id, eventType: 'AUTH.RID.BOUND', payload: { userId: user.userId, rid: user.rid, source }, actorId: assignedBy });
  });
}

function browserCookieMode(request: IncomingMessage): boolean {
  return typeof request.headers.origin === 'string' && String(request.headers['x-mw-auth-mode'] ?? '').toLowerCase() !== 'bearer';
}

function cookie(name: string, value: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === 'production' || process.env.MW_COOKIE_SECURE === '1';
  const sameSite = process.env.MW_COOKIE_SAME_SITE ?? 'Lax';
  return `${name}=${encodeURIComponent(value)}; Path=/api/v1; HttpOnly; SameSite=${sameSite}; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}${secure ? '; Secure' : ''}`;
}

function setSessionCookies(response: ServerResponse, session: any): void {
  const accessMaxAge = Math.max(0, Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000));
  const refreshMaxAge = Math.max(0, Math.floor((Date.parse(session.refreshExpiresAt) - Date.now()) / 1000));
  response.setHeader('Set-Cookie', [cookie('mw_access', session.accessToken, accessMaxAge), cookie('mw_refresh', session.refreshToken, refreshMaxAge)]);
}

function clearSessionCookies(response: ServerResponse): void {
  response.setHeader('Set-Cookie', [cookie('mw_access', '', 0), cookie('mw_refresh', '', 0)]);
}

function presentSession(request: IncomingMessage, response: ServerResponse, session: any): any {
  if (browserCookieMode(request)) {
    setSessionCookies(response, session);
    return { protocol: session.protocol, transport: 'cookie', expiresAt: session.expiresAt, refreshExpiresAt: session.refreshExpiresAt, sessionId: session.sessionId, user: session.user };
  }
  return { ...session, transport: 'bearer' };
}

authRouter.add('POST', '/api/v1/auth/register', async (_req, _reply, _params, body, _query, ctx) => {
  const payload = isRecord(body) ? body : {};
  const username = typeof payload.username === 'string' ? payload.username.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!username || !password) return httpError(400, 'USERNAME_PASSWORD_REQUIRED');
  if (password.length < 12) return httpError(400, 'PASSWORD_TOO_SHORT', 'Password must contain at least 12 characters');
  if (payload.rid !== undefined && payload.rid !== null && payload.rid !== '') {
    return httpError(400, 'RID_ASSIGNMENT_NOT_ALLOWED', 'RID assignment requires trusted provisioning');
  }
  try {
    return { statusCode: 201, body: await ctx.auth.createUser({ username, password, roles: ['USER'] }) };
  } catch (_error) {
    return httpError(409, 'USER_EXISTS');
  }
});

authRouter.add('POST', '/api/v1/auth/setup', async (req, reply, _params, body, _query, ctx) => {
  const authService = ctx.auth as unknown as { _users?: Map<string, unknown>; pool?: { query: (sql: string) => Promise<{rows: {n: string | number}[]}> } };
  // First-run setup: only allowed when zero users exist
  if (authService._users && authService._users.size > 0) return httpError(403, 'SETUP_ALREADY_COMPLETE');
  // Double-check against DB for postgres driver
  if (authService.pool) {
    const count = await authService.pool.query('SELECT count(*)::int AS n FROM auth_users');
    if (Number(count.rows[0]?.n ?? 0) > 0) return httpError(403, 'SETUP_ALREADY_COMPLETE');
  }
  const payload = isRecord(body) ? body : {};
  const username = typeof payload.username === 'string' ? payload.username.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!username || !password) return httpError(400, 'USERNAME_PASSWORD_REQUIRED');
  if (password.length < 12) return httpError(400, 'PASSWORD_TOO_SHORT', 'Password must contain at least 12 characters');
  try {
    const user = await ctx.auth.createUser({ username, password, roles: ['ADMIN'] });
    const session = await ctx.auth.login(username, password);
    if (!session) return { statusCode: 201, body: { user, session: null } };
    return presentSession(req, reply, session);
  } catch (error) {
    return httpError(409, 'USER_EXISTS', error instanceof Error ? error.message : String(error));
  }
});

authRouter.add('POST', '/api/v1/auth/login', async (req, reply, _params, body, _query, ctx) => {
  const payload = isRecord(body) ? body : {};
  const result = await ctx.auth.login(String(payload.username ?? ''), String(payload.password ?? ''));
  return result ? presentSession(req, reply, result) : httpError(401, 'INVALID_CREDENTIALS');
});

authRouter.add('POST', '/api/v1/auth/refresh', async (req, reply, _params, body, _query, ctx) => {
  const payload = isRecord(body) ? body : {};
  const refreshToken = typeof payload.refreshToken === 'string' ? payload.refreshToken : requestCookie(req, 'mw_refresh') ?? '';
  if (!refreshToken) return httpError(401, 'REFRESH_TOKEN_REQUIRED');
  const result = await ctx.auth.refresh(refreshToken);
  if (!result) { clearSessionCookies(reply); return httpError(401, 'INVALID_REFRESH_TOKEN'); }
  return presentSession(req, reply, result);
});

authRouter.add('POST', '/api/v1/auth/provision', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'ADMIN');
  if (!authz.ok) return authz.error;
  const payload = isRecord(body) ? body : {};
  const username = typeof payload.username === 'string' ? payload.username.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!username || !password || password.length < 12) return httpError(400, 'INVALID_PROVISIONING_PAYLOAD');
  const roles = Array.isArray(payload.roles) ? payload.roles.filter((value): value is string => typeof value === 'string') : ['USER'];
  try {
    const user = await ctx.auth.createUser({ username, password, rid: typeof payload.rid === 'string' ? payload.rid.trim() : undefined, roles });
    await recordRidBinding(ctx, user, authz.user.userId, 'ADMIN_PROVISION');
    return { statusCode: 201, body: user };
  } catch (error) {
    return httpError(409, 'USER_EXISTS', error instanceof Error ? error.message : String(error));
  }
});

authRouter.add('POST', '/api/v1/auth/bind-rid', async (req, _reply, _params, body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'ADMIN');
  if (!authz.ok) return authz.error;
  const payload = isRecord(body) ? body : {};
  const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
  const rid = typeof payload.rid === 'string' ? payload.rid.trim() : '';
  if (!userId || !rid) return httpError(400, 'USER_ID_RID_REQUIRED');
  try {
    const user = await ctx.auth.assignRid(userId, rid);
    await recordRidBinding(ctx, user, authz.user.userId, 'ADMIN_BIND_RID');
    return user;
  } catch (error) {
    const code = error instanceof Error ? error.message : String(error);
    if (code === 'USER_NOT_FOUND') return httpError(404, code);
    if (['RID_ALREADY_BOUND', 'RID_BINDING_CONFLICT', 'RID_BINDING_AUDIT_CONFLICT'].includes(code)) return httpError(409, code);
    return httpError(500, 'RID_BINDING_FAILED', code);
  }
});

authRouter.add('POST', '/api/v1/auth/logout', async (req, reply, _params, body, _query, ctx) => {
  const payload = isRecord(body) ? body : {};
  const token = bearerToken(req) || (typeof payload.refreshToken === 'string' ? payload.refreshToken : requestCookie(req, 'mw_refresh') ?? '');
  if (!token) return httpError(401, 'UNAUTHORIZED');
  const ok = await ctx.auth.logout(token);
  clearSessionCookies(reply);
  return { ok };
});

authRouter.add('GET', '/api/v1/auth/me', async (req, _reply, _params, _body, _query, ctx) => {
  const user = await ctx.auth.authenticate(bearerToken(req));
  return user ?? httpError(401, 'UNAUTHORIZED');
});

authRouter.add('GET', '/api/v1/auth/online', async (req, _reply, _params, _body, _query, ctx) => {
  const authz = await requirePermission(req, ctx.auth, 'ADMIN');
  if (!authz.ok) return authz.error;
  return { online: await ctx.auth.getOnlineUsers() };
});