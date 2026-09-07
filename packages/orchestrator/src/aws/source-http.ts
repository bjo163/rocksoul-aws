export interface AwsHttpTransportResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
}

export interface AwsHttpTransport {
  request(url: string, options: { signal: AbortSignal }): Promise<AwsHttpTransportResponse>;
}

export interface AwsOfficialSourceRequestOptions {
  allowedOrigins: readonly string[];
  timeoutMs?: number;
  retries?: number;
  maxBytes?: number;
  acceptedContentTypes?: readonly string[];
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_CONTENT_TYPES = ['text/html', 'text/plain', 'application/xhtml+xml'];

function normalizeOrigin(value: string): string {
  return new URL(value).origin;
}

function assertAllowed(url: string, allowedOrigins: readonly string[]): void {
  const origin = normalizeOrigin(url);
  const allowed = new Set(allowedOrigins.map(normalizeOrigin));
  if (!allowed.has(origin)) throw new Error(`AWS_SOURCE_ORIGIN_REJECTED:${origin}`);
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function contentType(headers: Record<string, string>): string {
  return headers['content-type'] ?? headers['Content-Type'] ?? '';
}

export class FetchAwsHttpTransport implements AwsHttpTransport {
  async request(url: string, options: { signal: AbortSignal }): Promise<AwsHttpTransportResponse> {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: options.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
        'user-agent': 'MoonWitness-AWS-Research/1.0',
      },
    });
    const body = new Uint8Array(await response.arrayBuffer());
    return {
      url: response.url || url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  }
}

/**
 * Hardened boundary for official legal sources.
 *
 * Legal adapters never call fetch directly. Redirects are rejected instead of
 * silently following to another origin. Retries are bounded and only apply to
 * retryable network/status failures.
 */
export class AwsOfficialSourceHttpClient {
  constructor(private readonly transport: AwsHttpTransport = new FetchAwsHttpTransport()) {}

  async getText(url: string, options: AwsOfficialSourceRequestOptions): Promise<string> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retries = options.retries ?? DEFAULT_RETRIES;
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    const acceptedContentTypes = options.acceptedContentTypes ?? DEFAULT_CONTENT_TYPES;

    assertAllowed(url, options.allowedOrigins);
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await this.transport.request(url, { signal: controller.signal });
        assertAllowed(response.url, options.allowedOrigins);

        if (response.status >= 300 && response.status < 400) {
          throw new Error(`AWS_SOURCE_REDIRECT_REJECTED:${response.status}`);
        }
        if (isRetryableStatus(response.status)) {
          throw new Error(`AWS_SOURCE_RETRYABLE_STATUS:${response.status}`);
        }
        if (response.status < 200 || response.status >= 300) {
          throw new Error(`AWS_SOURCE_HTTP_STATUS:${response.status}`);
        }
        if (response.body.byteLength > maxBytes) {
          throw new Error(`AWS_SOURCE_BODY_TOO_LARGE:${response.body.byteLength}`);
        }

        const type = contentType(response.headers).toLowerCase();
        if (type && !acceptedContentTypes.some((accepted) => type.includes(accepted))) {
          throw new Error(`AWS_SOURCE_CONTENT_TYPE_REJECTED:${type}`);
        }

        return new TextDecoder('utf-8', { fatal: false }).decode(response.body);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const retryable =
          message.startsWith('AWS_SOURCE_RETRYABLE_STATUS:') ||
          message.includes('fetch failed') ||
          message.includes('network') ||
          message.includes('aborted') ||
          error instanceof DOMException;
        if (!retryable || attempt === retries) throw error;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('AWS_SOURCE_FETCH_FAILED');
  }
}
