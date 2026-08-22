import {
  ContractValidationError,
  assertApiResponseContract,
  type AnalysisResultContract,
  type AuthLoginRequest,
  type AuthSessionContract,
  type EvidenceAttachmentRequest,
  type EvidenceAttachmentResponse,
  type EvidenceListResponse,
  type PublicUserContract,
  type ReviewCreateRequest,
  type ReviewRecord,
  type ReviewTransitionRequest,
  type UniverseAnalysisRequest,
  type UniverseCommandRequest,
  type UniverseEvaluationRequest,
  type UniverseEvaluationResponse,
  type UniverseObservationRequest,
  type UniverseObservationResponse,
  type UniverseQueryListResponse,
  type UniverseQueryRequest,
  type UniverseQueryResponse,
  type UniverseRecord,
  type XrpWorkspaceResponse,
} from '@moonwitness/contracts';

export interface UniverseClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
  authMode?: 'bearer' | 'cookie';
  session?: AuthSessionContract | null;
  onSessionChange?: (session: AuthSessionContract | null) => void;
}

export class UniverseApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    super(`Universe API request failed: ${status}`);
    this.name = 'UniverseApiError';
    this.status = status;
    this.body = body;
  }
}

export class UniverseContractError extends Error {
  readonly path: string;
  readonly cause: unknown;
  constructor(path: string, cause: unknown) {
    super(`Universe API contract failed for ${path}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'UniverseContractError';
    this.path = path;
    this.cause = cause;
  }
}

function idempotencyKey(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `mw-${uuid}` : `mw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function retryableStatus(status: number): boolean {
  return [408, 429, 502, 503, 504].includes(status);
}

export class UniverseClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly authMode: 'bearer' | 'cookie';
  private readonly onSessionChange?: (session: AuthSessionContract | null) => void;
  private session: AuthSessionContract | null;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(options: UniverseClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.headers = { ...(options.headers ?? {}) };
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.maxRetries = Math.max(0, options.maxRetries ?? 2);
    this.authMode = options.authMode ?? 'bearer';
    this.session = options.session ?? null;
    this.onSessionChange = options.onSessionChange;
  }

  getSession(): AuthSessionContract | null { return this.session; }

  setSession(session: AuthSessionContract | null): void {
    this.session = session;
    this.onSessionChange?.(session);
  }

  private async refreshSession(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = (async () => {
      const body = this.authMode === 'bearer' && this.session?.refreshToken ? JSON.stringify({ refreshToken: this.session.refreshToken }) : undefined;
      try {
        const session = await this.request<AuthSessionContract>('/api/v1/auth/refresh', { method: 'POST', ...(body ? { body } : {}) }, { skipRefresh: true, maxRetries: 0 });
        this.setSession(session);
        return true;
      } catch {
        this.setSession(null);
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  private async request<T>(path: string, init: RequestInit, policy: { skipRefresh?: boolean; maxRetries?: number } = {}): Promise<T> {
    const method = String(init.method ?? 'GET').toUpperCase();
    const pathOnly = path.split('?')[0];
    const canRetry = method === 'GET' || new Headers(init.headers).has('idempotency-key');
    const allowedRetries = canRetry ? (policy.maxRetries ?? this.maxRetries) : 0;
    let refreshed = false;

    for (let attempt = 0; ; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const headers = new Headers(this.headers);
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
        if (init.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json');
        if (this.authMode === 'bearer') {
          headers.set('x-mw-auth-mode', 'bearer');
          const accessToken = this.session?.accessToken ?? this.session?.token;
          if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
        }
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers, credentials: this.authMode === 'cookie' ? 'include' : init.credentials, signal: init.signal ?? controller.signal });
        const text = await response.text();
        let body: unknown = null;
        try { body = text ? JSON.parse(text) : null; } catch (error) { throw new UniverseContractError(pathOnly, new Error('Response is not valid JSON', { cause: error })); }
        const refreshExcluded = ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/logout'].includes(pathOnly);
        if (response.status === 401 && !policy.skipRefresh && !refreshed && !refreshExcluded) {
          refreshed = true;
          if (await this.refreshSession()) { attempt -= 1; continue; }
        }
        if (!response.ok) {
          if (attempt < allowedRetries && retryableStatus(response.status)) continue;
          throw new UniverseApiError(response.status, body);
        }
        try { assertApiResponseContract(method, pathOnly, body); } catch (error) {
          if (error instanceof ContractValidationError) throw new UniverseContractError(pathOnly, error);
          throw error;
        }
        return body as T;
      } catch (error) {
        const networkFailure = error instanceof TypeError || (error instanceof DOMException && error.name === 'AbortError');
        if (networkFailure && attempt < allowedRetries) continue;
        if (error instanceof DOMException && error.name === 'AbortError') throw new UniverseApiError(408, { error: 'REQUEST_TIMEOUT' });
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  async register(input: AuthLoginRequest): Promise<PublicUserContract> {
    return this.request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(input) });
  }

  async login(input: AuthLoginRequest): Promise<AuthSessionContract> {
    const session = await this.request<AuthSessionContract>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(input) }, { skipRefresh: true });
    this.setSession(session);
    return session;
  }

  async refresh(): Promise<AuthSessionContract> {
    if (!await this.refreshSession() || !this.session) throw new UniverseApiError(401, { error: 'INVALID_REFRESH_TOKEN' });
    return this.session;
  }

  async logout(): Promise<{ ok: boolean }> {
    const body = this.authMode === 'bearer' && this.session?.refreshToken ? JSON.stringify({ refreshToken: this.session.refreshToken }) : undefined;
    try { return await this.request('/api/v1/auth/logout', { method: 'POST', ...(body ? { body } : {}) }, { skipRefresh: true }); }
    finally { this.setSession(null); }
  }

  me(): Promise<PublicUserContract> { return this.request('/api/v1/auth/me', { method: 'GET' }); }
  xrpWorkspace(): Promise<XrpWorkspaceResponse> { return this.request('/api/v1/xrp/workspace', { method: 'GET' }); }
  observe(input: UniverseObservationRequest): Promise<UniverseObservationResponse> { return this.request('/api/v1/observe', { method: 'POST', body: JSON.stringify(input) }); }
  analyze(input: UniverseAnalysisRequest): Promise<AnalysisResultContract> { return this.request('/api/v1/analyze', { method: 'POST', body: JSON.stringify(input) }); }
  evaluate(input: UniverseEvaluationRequest): Promise<UniverseEvaluationResponse> { return this.request('/api/v1/evaluate', { method: 'POST', body: JSON.stringify(input) }); }
  query(input: UniverseQueryRequest): Promise<UniverseQueryResponse | UniverseQueryListResponse> { return this.request('/api/v1/query', { method: 'POST', body: JSON.stringify(input) }); }
  command(input: UniverseCommandRequest, key = idempotencyKey()): Promise<UniverseRecord> { return this.request('/api/v1/command', { method: 'POST', headers: { 'idempotency-key': key }, body: JSON.stringify(input) }); }
  resource(id: string): Promise<UniverseRecord> { return this.request(`/api/v1/resource/${encodeURIComponent(id)}`, { method: 'GET' }); }
  attachEvidence(id: string, input: EvidenceAttachmentRequest): Promise<EvidenceAttachmentResponse> { return this.request(`/api/v1/resource/${encodeURIComponent(id)}/evidence`, { method: 'POST', body: JSON.stringify(input) }); }
  listEvidence(id: string): Promise<EvidenceListResponse> { return this.request(`/api/v1/resource/${encodeURIComponent(id)}/evidence`, { method: 'GET' }); }
  reviews(): Promise<{ reviews: Array<{ id: string; payload: ReviewRecord }> }> { return this.request('/api/v1/reviews', { method: 'GET' }); }
  createReview(input: ReviewCreateRequest): Promise<ReviewRecord> { return this.request('/api/v1/reviews', { method: 'POST', body: JSON.stringify(input) }); }
  transitionReview(id: string, input: ReviewTransitionRequest): Promise<ReviewRecord> { return this.request(`/api/v1/reviews/${encodeURIComponent(id)}/transition`, { method: 'POST', body: JSON.stringify(input) }); }
}
