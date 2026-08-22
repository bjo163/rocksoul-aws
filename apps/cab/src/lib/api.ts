import type { AnalysisResult, Model } from '../types';

const AUTH_KEY = 'moonwitness.auth';

export function getToken(): string | null {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')?.token ?? null; } catch { return null; }
}
export function saveAuth(payload: unknown): void { localStorage.setItem(AUTH_KEY, JSON.stringify(payload)); }
export function clearAuth(): void { localStorage.removeItem(AUTH_KEY); }

export async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {...init, headers, signal: init?.signal ?? controller.signal});
    const raw = await res.text();
    let body: any = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
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

export const api = {
  health: () => getJSON('/api/v1/health'),
  register: (body: {username:string; password:string; rid?:string}) => getJSON('/api/v1/auth/register', {method:'POST', body:JSON.stringify(body)}),
  login: (body: {username:string; password:string}) => getJSON('/api/v1/auth/login', {method:'POST', body:JSON.stringify(body)}),
  logout: () => getJSON('/api/v1/auth/logout', {method:'POST'}),
  me: () => getJSON('/api/v1/auth/me'),
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
