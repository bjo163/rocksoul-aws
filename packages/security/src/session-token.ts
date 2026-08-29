import crypto from 'node:crypto';

export interface AccessTokenClaims {
  userId: string;
  username: string;
  roles: string[];
  rid: string | null;
  sid: string;
  jti: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

function base64url(value: string | Buffer): string {
  return (typeof value === 'string' ? Buffer.from(value) : value).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createRefreshToken(): string {
  return base64url(crypto.randomBytes(48));
}

export function signAccessToken(input: {
  secret: string;
  ttlMs: number;
  sessionId: string;
  userId: string;
  username: string;
  roles: string[];
  rid: string | null;
  issuer?: string;
  audience?: string;
}): { token: string; expiresAt: string } {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAtMs = Date.now() + input.ttlMs;
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = {
    userId: input.userId,
    username: input.username,
    roles: input.roles,
    rid: input.rid,
    sid: input.sessionId,
    jti: crypto.randomUUID(),
    iat: issuedAt,
    exp: Math.floor(expiresAtMs / 1000),
    ...(input.issuer ? { iss: input.issuer } : {}),
    ...(input.audience ? { aud: input.audience } : {}),
  };
  const payload = base64url(JSON.stringify(claims));
  const signature = base64url(crypto.createHmac('sha256', input.secret).update(`${header}.${payload}`).digest());
  return { token: `${header}.${payload}.${signature}`, expiresAt: new Date(expiresAtMs).toISOString() };
}

export function verifyAccessToken(token: string, input: { secret: string; issuer?: string; audience?: string }): AccessTokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) as Record<string, unknown>;
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const expected = Buffer.from(base64url(crypto.createHmac('sha256', input.secret).update(`${parts[0]}.${parts[1]}`).digest()), 'ascii');
    const supplied = Buffer.from(parts[2], 'ascii');
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as Record<string, unknown>;
    const now = Date.now();
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now) return null;
    if (typeof claims.iat !== 'number' || claims.iat * 1000 > now + 30_000) return null;
    if (typeof claims.nbf === 'number' && claims.nbf * 1000 > now) return null;
    if (input.issuer && claims.iss !== input.issuer) return null;
    if (input.audience && claims.aud !== input.audience) return null;
    if (typeof claims.userId !== 'string' || typeof claims.username !== 'string' || typeof claims.sid !== 'string' || typeof claims.jti !== 'string' || !Array.isArray(claims.roles)) return null;
    if (claims.rid !== null && typeof claims.rid !== 'string') return null;
    return claims as unknown as AccessTokenClaims;
  } catch {
    return null;
  }
}
