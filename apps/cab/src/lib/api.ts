import type { AnalysisResult, Model } from '../types';

const AUTH_KEY = 'moonwitness.auth';
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8787';
function apiUrl(url: string): string { return url.startsWith('/api/') ? `${API_BASE}${url}` : url; }

export function hasStoredSession(): boolean {
  try { return Boolean(JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')?.sessionId); } catch { return false; }
}
export function saveAuth(payload: any): void {
  const safe = payload && typeof payload === 'object' ? { protocol: payload.protocol, transport: 'cookie', expiresAt: payload.expiresAt, refreshExpiresAt: payload.refreshExpiresAt, sessionId: payload.sessionId, user: payload.user } : null;
  localStorage.setItem(AUTH_KEY, JSON.stringify(safe));
}
export function clearAuth(): void { localStorage.removeItem(AUTH_KEY); }

async function requestJSON<T>(url: string, init?: RequestInit, allowRefresh = true): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined) headers.set('content-type', 'application/json');
  const method = String(init?.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(method) && !url.startsWith('/api/v1/auth/') && !headers.has('idempotency-key')) {
    headers.set('idempotency-key', globalThis.crypto?.randomUUID?.() ?? `cab-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(apiUrl(url), {...init, headers, credentials:'include', signal: init?.signal ?? controller.signal});
    const raw = await res.text();
    let body: any = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
    if (res.status === 401 && allowRefresh && !url.startsWith('/api/v1/auth/')) {
      const refreshed = await requestJSON<any>('/api/v1/auth/refresh', {method:'POST'}, false).catch(() => null);
      if (refreshed?.sessionId) { saveAuth(refreshed); return requestJSON<T>(url, {...init, headers}, false); }
      clearAuth();
    }
    if (!res.ok) {
      const message = typeof body === 'object' && body?.message ? body.message : (typeof body === 'object' && body?.error ? body.error : raw || res.statusText);
      throw new Error(`${res.status} ${message}`);
    }
    return body as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('REQUEST_TIMEOUT');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getJSON<T>(url: string, init?: RequestInit): Promise<T> { return requestJSON<T>(url, init); }

export const api = {
  health: () => getJSON('/api/v1/health'),
  login: (body: {username:string; password:string}) => getJSON('/api/v1/auth/login', {method:'POST', body:JSON.stringify(body)}),
  logout: () => getJSON('/api/v1/auth/logout', {method:'POST'}),
  me: () => getJSON('/api/v1/auth/me'),
  onlineUsers: () => getJSON<{online: any[]}>('/api/v1/auth/online'),
  provisionUser: (body: any) => getJSON('/api/v1/auth/provision', {method:'POST', body:JSON.stringify(body)}),
  bindRid: (body: any) => getJSON('/api/v1/auth/bind-rid', {method:'POST', body:JSON.stringify(body)}),
  features: () => getJSON<any[]>('/api/v1/features'),
  prophets: () => getJSON<any[]>('/api/v1/prophets'),
  models: (q='') => getJSON<Model[]>(`/api/v1/models${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  model: (typeId: string) => getJSON<Model>(`/api/v1/models/${encodeURIComponent(typeId)}`),
  entities: (typeId?: string, q?: string) => {
    const params = new URLSearchParams();
    if (typeId) params.append('type', typeId);
    if (q) params.append('q', q);
    const qs = params.toString();
    return getJSON<any[]>(`/api/v1/entities${qs ? `?${qs}` : ''}`);
  },
  createEntity: (typeId: string, payload: any) => 
    getJSON(`/api/v1/entities?type=${encodeURIComponent(typeId)}`, { method: 'POST', body: JSON.stringify({
      entityId: String(payload.id || `ENT_${Date.now()}`),
      type: typeId,
      data: payload
    }) }),
  updateEntity: (id: string, payload: any) => getJSON(`/api/v1/entities/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEntity: (id: string) => getJSON(`/api/v1/entities/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  graph: (id: string) => getJSON(`/api/v1/entities/${encodeURIComponent(id)}/graph`),
  analyzeText: (text: string) => getJSON<AnalysisResult>('/api/v1/ai/analyze', { method: 'POST', body: JSON.stringify({ text }) }),
  universeObserve: (body: unknown) => getJSON('/api/v1/observe', { method:'POST', body: JSON.stringify(body) }),
  universeAnalyze: (body: unknown) => getJSON('/api/v1/analyze', { method:'POST', body: JSON.stringify(body) }),
  universeEvaluate: (body: unknown) => getJSON('/api/v1/evaluate', { method:'POST', body: JSON.stringify(body) }),
  universeQuery: (body: unknown) => getJSON('/api/v1/query', { method:'POST', body: JSON.stringify(body) }),
  universeCommand: (body: unknown) => getJSON('/api/v1/command', { method:'POST', body: JSON.stringify(body) }),
  universeResource: (id: string) => getJSON(`/api/v1/resource/${encodeURIComponent(id)}`),
  evidence: (id: string) => getJSON(`/api/v1/resource/${encodeURIComponent(id)}/evidence`),
  attachEvidence: (id: string, body: unknown) => getJSON(`/api/v1/resource/${encodeURIComponent(id)}/evidence`, {method:'POST',body:JSON.stringify(body)}),
  resourceAudit: (id: string) => getJSON(`/api/v1/resource/${encodeURIComponent(id)}/audit`),
  resourceReplay: (id: string) => getJSON(`/api/v1/resource/${encodeURIComponent(id)}/replay`),
  reviews: () => getJSON<{reviews:any[]}>('/api/v1/reviews'),
  createReview: (body: unknown) => getJSON('/api/v1/reviews', {method:'POST',body:JSON.stringify(body)}),
  transitionReview: (id:string,body:unknown) => getJSON(`/api/v1/reviews/${encodeURIComponent(id)}/transition`, {method:'POST',body:JSON.stringify(body)}),
  kernelGraph: () => getJSON('/api/v1/kernel/graph'),
  kernelIntegrity: () => getJSON('/api/v1/kernel/graph/integrity'),
  kernelLedger: () => getJSON('/api/v1/kernel/ledger'),
  witnessStatus: () => getJSON('/api/v1/witness/status')
};
