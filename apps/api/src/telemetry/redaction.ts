const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-mw-auth-mode',
]);

const SENSITIVE_BODY_KEYS = new Set([
  'password',
  'token',
  'secret',
  'refreshtoken',
  'accesstoken',
  'sourcetext',
]);

const SENSITIVE_PATH_KEYWORDS = new Set([
  'password',
  'token',
  'secret',
  'auth',
  'credentials',
  'api-key',
]);

const SENSITIVE_ATTR_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /credential/i,
  /auth/i,
];

function looksLikeSensitiveText(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return value.length > 500;
}

export function redactHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function redactBody(body: unknown): unknown {
  if (body === null || body === undefined) return body;
  if (typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(redactBody);
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (SENSITIVE_BODY_KEYS.has(normalizedKey)) {
      redacted[key] = '[REDACTED]';
    } else if (key.toLowerCase() === 'text' && looksLikeSensitiveText(value)) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = redactBody(value);
    }
  }
  return redacted;
}

export function redactPath(path: string): string {
  return path
    .split('/')
    .map((segment) => {
      if (SENSITIVE_PATH_KEYWORDS.has(segment.toLowerCase())) {
        return '[REDACTED]';
      }
      return segment;
    })
    .join('/');
}

export function redactTraceAttributes(
  attrs: Record<string, unknown>,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (SENSITIVE_ATTR_PATTERNS.some((pattern) => pattern.test(key))) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
