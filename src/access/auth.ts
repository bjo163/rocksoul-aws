import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRefreshToken, hashOpaqueToken, signAccessToken, verifyAccessToken } from './session-token.js';

export interface AuthUser {
  userId: string;
  username: string;
  passwordHash: string;
  rid: string | null;
  roles: string[];
  active: boolean;
  createdAt: string;
}

export interface PublicUser {
  userId: string;
  username: string;
  rid: string | null;
  roles: string[];
  active: boolean;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface CreateUserInput {
  username: string;
  password: string;
  rid?: string;
  roles?: string[];
}

export interface AuthSession {
  protocol: 'MW_AUTH_SESSION_V1';
  token: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  sessionId: string;
  user: PublicUser;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  createdAt: string;
  refreshExpiresAt: string;
  lastSeen: string;
  revokedAt?: string;
  rotationCounter: number;
}

export interface AuthOptions {
  sessionTtlMs?: number;
  refreshTtlMs?: number;
  storagePath?: string;
  sessionStoragePath?: string;
  jwtSecret?: string;
  issuer?: string;
  audience?: string;
}

type Awaitable<T> = T | Promise<T>;
export interface AuthService {
  createUser(input: CreateUserInput): Awaitable<PublicUser>;
  assignRid(userId: string, rid: string): Awaitable<PublicUser>;
  login(username: string, password: string): Awaitable<AuthSession | null>;
  refresh(refreshToken: string): Awaitable<AuthSession | null>;
  authenticate(token: string): Awaitable<PublicUser | null>;
  logout(tokenOrRefreshToken: string): Awaitable<boolean>;
  revokeAll(userId: string): Awaitable<number>;
  getOnlineUsers(): Awaitable<PublicUser[]>;
  readonly _users: Map<string, AuthUser>;
  readonly _revokedTokens: Set<string>;
  readonly _sessions: Map<string, SessionRecord>;
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): string {
  const derived = crypto.scryptSync(String(password), salt, 32);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hashHex) return false;
  const actual = crypto.scryptSync(String(password), salt, 32);
  const expected = Buffer.from(hashHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function createAuthService(options: AuthOptions = {}): AuthService {
  const users = new Map<string, AuthUser>();
  const revokedTokens = new Set<string>();
  const sessions = new Map<string, SessionRecord>();
  const accessTtlMs = Number(options.sessionTtlMs ?? process.env.MW_ACCESS_TOKEN_TTL_MS ?? 15 * 60 * 1000);
  const refreshTtlMs = Number(options.refreshTtlMs ?? process.env.MW_REFRESH_TOKEN_TTL_MS ?? 30 * 24 * 60 * 60 * 1000);
  if (process.env.NODE_ENV === 'production' && !options.jwtSecret) throw new Error('JWT_SECRET_REQUIRED_IN_PRODUCTION');
  const jwtSecret = options.jwtSecret || crypto.randomBytes(32).toString('hex');
  const issuer = options.issuer ?? process.env.MW_JWT_ISSUER;
  const audience = options.audience ?? process.env.MW_JWT_AUDIENCE;
  const storagePath = options.storagePath ? path.resolve(options.storagePath) : null;
  const sessionStoragePath = options.sessionStoragePath
    ? path.resolve(options.sessionStoragePath)
    : storagePath ? path.join(path.dirname(storagePath), 'auth-sessions.json') : null;

  function atomicWrite(filePath: string, value: unknown): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, filePath);
  }

  function loadUsers(): void {
    if (!storagePath || !fs.existsSync(storagePath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
      for (const user of Array.isArray(raw?.users) ? raw.users : []) if (user?.username && user?.userId) users.set(user.username, user as AuthUser);
    } catch { /* corrupt auth data fails closed */ }
  }

  function loadSessions(): void {
    if (!sessionStoragePath || !fs.existsSync(sessionStoragePath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(sessionStoragePath, 'utf8'));
      for (const session of Array.isArray(raw?.sessions) ? raw.sessions : []) {
        if (session?.sessionId && session?.userId && session?.refreshTokenHash) sessions.set(session.sessionId, session as SessionRecord);
      }
    } catch { /* corrupt session data fails closed */ }
    cleanupExpiredSessions();
  }

  function persistUsers(): void {
    if (storagePath) atomicWrite(storagePath, { version: 1, users: [...users.values()] });
  }

  function persistSessions(): void {
    if (sessionStoragePath) atomicWrite(sessionStoragePath, { version: 1, sessions: [...sessions.values()] });
  }

  function cleanupExpiredSessions(): void {
    const now = Date.now();
    let changed = false;
    for (const [sessionId, session] of sessions) {
      if (Date.parse(session.refreshExpiresAt) <= now) { sessions.delete(sessionId); changed = true; }
    }
    if (changed && sessionStoragePath) persistSessions();
  }

  function findUserById(userId: string): AuthUser | undefined {
    return [...users.values()].find((user) => user.userId === userId);
  }

  function activeSessionForUser(userId: string): SessionRecord | undefined {
    const now = Date.now();
    return [...sessions.values()].filter((session) => session.userId === userId && !session.revokedAt && Date.parse(session.refreshExpiresAt) > now).sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen))[0];
  }

  function publicUser(user: AuthUser): PublicUser {
    const session = activeSessionForUser(user.userId);
    const lastSeen = session?.lastSeen;
    return {
      userId: user.userId,
      username: user.username,
      rid: user.rid,
      roles: [...user.roles],
      active: user.active,
      lastSeen,
      isOnline: lastSeen ? Date.now() - Date.parse(lastSeen) < 5 * 60 * 1000 : false,
    };
  }

  function issueSession(user: AuthUser, session?: SessionRecord): AuthSession {
    const now = new Date();
    const refreshToken = createRefreshToken();
    const record: SessionRecord = session ?? {
      sessionId: crypto.randomUUID(),
      userId: user.userId,
      refreshTokenHash: '',
      createdAt: now.toISOString(),
      refreshExpiresAt: new Date(now.getTime() + refreshTtlMs).toISOString(),
      lastSeen: now.toISOString(),
      rotationCounter: 0,
    };
    record.refreshTokenHash = hashOpaqueToken(refreshToken);
    record.lastSeen = now.toISOString();
    record.revokedAt = undefined;
    record.rotationCounter += 1;
    sessions.set(record.sessionId, record);
    persistSessions();
    const access = signAccessToken({ secret: jwtSecret, ttlMs: accessTtlMs, sessionId: record.sessionId, userId: user.userId, username: user.username, roles: user.roles, rid: user.rid, issuer, audience });
    return { protocol: 'MW_AUTH_SESSION_V1', token: access.token, accessToken: access.token, refreshToken, expiresAt: access.expiresAt, refreshExpiresAt: record.refreshExpiresAt, sessionId: record.sessionId, user: publicUser(user) };
  }

  loadUsers();
  loadSessions();

  function createUser({ username, password, rid, roles = ['USER'] }: CreateUserInput): PublicUser {
    if (!username || !password) throw new Error('username and password are required');
    if (users.has(username)) throw new Error('user already exists');
    const user: AuthUser = { userId: `USR-${crypto.randomUUID()}`, username, passwordHash: hashPassword(password), rid: rid || null, roles: [...roles], active: true, createdAt: new Date().toISOString() };
    users.set(username, user);
    persistUsers();
    return publicUser(user);
  }

  function assignRid(userId: string, rid: string): PublicUser {
    const normalized = rid.trim();
    if (!normalized) throw new Error('RID_REQUIRED');
    const user = findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.rid && user.rid !== normalized) throw new Error('RID_ALREADY_BOUND');
    if (user.rid === normalized) return publicUser(user);
    user.rid = normalized;
    persistUsers();
    revokeAll(userId);
    return publicUser(user);
  }

  function login(username: string, password: string): AuthSession | null {
    const user = users.get(username);
    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) return null;
    cleanupExpiredSessions();
    return issueSession(user);
  }

  function refresh(refreshToken: string): AuthSession | null {
    if (!refreshToken) return null;
    const tokenHash = hashOpaqueToken(refreshToken);
    const session = [...sessions.values()].find((candidate) => candidate.refreshTokenHash === tokenHash);
    if (!session || session.revokedAt || Date.parse(session.refreshExpiresAt) <= Date.now()) return null;
    const user = findUserById(session.userId);
    if (!user || !user.active) return null;
    return issueSession(user, session);
  }

  function authenticate(token: string): PublicUser | null {
    if (!token || revokedTokens.has(token)) return null;
    const claims = verifyAccessToken(token, { secret: jwtSecret, issuer, audience });
    if (!claims) return null;
    const session = sessions.get(claims.sid);
    if (!session || session.userId !== claims.userId || session.revokedAt || Date.parse(session.refreshExpiresAt) <= Date.now()) return null;
    const user = findUserById(claims.userId);
    if (!user || !user.active) return null;
    const now = new Date();
    if (Date.now() - Date.parse(session.lastSeen) > 60_000) { session.lastSeen = now.toISOString(); persistSessions(); }
    return publicUser(user);
  }

  function logout(tokenOrRefreshToken: string): boolean {
    if (!tokenOrRefreshToken) return true;
    const claims = verifyAccessToken(tokenOrRefreshToken, { secret: jwtSecret, issuer, audience });
    const refreshHash = claims ? null : hashOpaqueToken(tokenOrRefreshToken);
    const session = claims ? sessions.get(claims.sid) : [...sessions.values()].find((candidate) => candidate.refreshTokenHash === refreshHash);
    if (session && !session.revokedAt) session.revokedAt = new Date().toISOString();
    if (claims) revokedTokens.add(tokenOrRefreshToken);
    persistSessions();
    return true;
  }

  function revokeAll(userId: string): number {
    let count = 0;
    const now = new Date().toISOString();
    for (const session of sessions.values()) if (session.userId === userId && !session.revokedAt) { session.revokedAt = now; count += 1; }
    if (count) persistSessions();
    return count;
  }

  function getOnlineUsers(): PublicUser[] {
    cleanupExpiredSessions();
    return [...users.values()].map(publicUser).filter((user) => user.isOnline);
  }

  return { createUser, assignRid, login, refresh, authenticate, logout, revokeAll, getOnlineUsers, _users: users, _revokedTokens: revokedTokens, _sessions: sessions };
}

export default { createAuthService, hashPassword, verifyPassword };
