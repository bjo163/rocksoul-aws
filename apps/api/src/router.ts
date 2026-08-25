import { IncomingMessage, ServerResponse } from 'node:http';
import { hasPermission, type ActionPermission, type AuthorizationUser } from '../../../src/security/authorization.js';

export const CANONICAL_V1_ROUTES = {
  health: '/api/v1/health',
  ready: '/api/v1/ready',
  authLogin: '/api/v1/auth/login',
  authRefresh: '/api/v1/auth/refresh',
  authLogout: '/api/v1/auth/logout',
  command: '/api/v1/command',
  query: '/api/v1/query',
  analyze: '/api/v1/analyze',
} as const;

export interface Authenticator {
  authenticate(token: string): Promise<AuthorizationUser | null>;
}

export type RouterContext = Record<string, unknown>;
export type RouteResult = object | { statusCode: number; body: unknown } | undefined;
export type RouteHandler = (request: IncomingMessage, response: ServerResponse, params: Record<string, string>, body: unknown, query: URLSearchParams, ctx: RouterContext) => Promise<RouteResult> | RouteResult;

export class URLPattern { constructor(readonly regex: RegExp, readonly paramNames: string[]) {} }
export interface Route { method: string; pattern: URLPattern; paramNames: string[]; handler: RouteHandler; }
export class Router {
  readonly routes: Route[] = [];
  add(method: string, routePath: string, handler: RouteHandler): void {
    const paramNames: string[] = [];
    const source = routePath.split('/').map((segment) => {
      if (segment.startsWith(':')) { paramNames.push(segment.slice(1)); return '([^/]+)'; }
      return segment.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
    }).join('/');
    this.routes.push({ method, pattern: new URLPattern(new RegExp(`^${source}/?$`), paramNames), paramNames, handler });
  }
  use(router: Router) { this.routes.push(...router.routes); }
}

export function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function asRecord(value: unknown): Record<string, unknown> { return isRecord(value) ? value : {}; }
export function httpError(statusCode: number, error: string, message?: string): { statusCode: number; body: Record<string, unknown> } { const exposeMessage = process.env.NODE_ENV !== 'production'; return { statusCode, body: { error, ...(exposeMessage && message ? { message } : {}) } }; }
export function isHttpError(value: unknown): value is { statusCode: number; body: Record<string, unknown> } { return isRecord(value) && typeof value.statusCode === 'number' && isRecord(value.body); }
export function isStatusBody(value: unknown): value is { statusCode: number; body: Record<string, unknown> } { return isRecord(value) && typeof value.statusCode === 'number' && isRecord(value.body); }
export function writeJson(response: ServerResponse, statusCode: number, body: unknown): void { const payload = JSON.stringify(body ?? null); response.statusCode = statusCode; response.setHeader('content-type', 'application/json; charset=utf-8'); response.setHeader('content-length', Buffer.byteLength(payload)); response.end(payload); }
export class HttpBodyError extends Error { constructor(readonly statusCode: 400 | 413, readonly code: 'MALFORMED_JSON' | 'REQUEST_BODY_TOO_LARGE', message: string) { super(message); } }
export async function readJsonBody(request: IncomingMessage): Promise<unknown> { const method = (request.method ?? 'GET').toUpperCase(); if (method === 'GET' || method === 'HEAD') return undefined; const maxBytes = Number(process.env.MW_MAX_BODY_BYTES ?? 1024 * 1024); const chunks: Buffer[] = []; let total = 0; for await (const chunk of request) { const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); total += buffer.length; if (total > maxBytes) throw new HttpBodyError(413, 'REQUEST_BODY_TOO_LARGE', `Request body exceeds ${maxBytes} bytes`); chunks.push(buffer); } if (chunks.length === 0) return undefined; const text = Buffer.concat(chunks).toString('utf8').trim(); if (!text) return undefined; try { return JSON.parse(text); } catch { throw new HttpBodyError(400, 'MALFORMED_JSON', 'Request body must be valid JSON'); } }
export function bearerToken(request: IncomingMessage): string { const header = String(request.headers.authorization ?? ''); if (header.startsWith('Bearer ')) return header.slice(7); return requestCookie(request, 'mw_access') ?? ''; }
export function requestCookie(request: IncomingMessage, name: string): string | null { const raw = typeof request.headers.cookie === 'string' ? request.headers.cookie : ''; for (const part of raw.split(';')) { const separator = part.indexOf('='); if (separator < 0) continue; const key = part.slice(0, separator).trim(); if (key !== name) continue; try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return null; } } return null; }
export function idempotencyKey(req: IncomingMessage): string | null { const raw = req.headers['idempotency-key']; return typeof raw === 'string' && raw.trim() ? raw.trim() : null; }
export async function requirePermission(req: IncomingMessage, auth: Authenticator, permission: ActionPermission) { const token = bearerToken(req); const user = await auth.authenticate(token); if (!user) return { ok: false, error: httpError(401, 'UNAUTHORIZED') }; if (!hasPermission(user, permission)) return { ok: false, error: httpError(403, 'PERMISSION_DENIED', permission) }; return { ok: true, user }; }
export async function requireAuthenticated(req: IncomingMessage, auth: Authenticator) { const user = await auth.authenticate(bearerToken(req)); return user ? { ok: true, user } : { ok: false, error: httpError(401, 'UNAUTHORIZED') }; }
