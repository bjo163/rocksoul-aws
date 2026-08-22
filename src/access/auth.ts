import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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

export interface AuthOptions {
  sessionTtlMs?: number; 
  storagePath?: string;
  jwtSecret?: string;
  issuer?: string;
  audience?: string;
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")): string {
  const derived = crypto.scryptSync(String(password), salt, 32);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hashHex] = String(stored).split("$");
  if (scheme !== "scrypt" || !salt || !hashHex) return false;
  const actual = crypto.scryptSync(String(password), salt, 32);
  const expected = Buffer.from(hashHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// Native JWT utilities
function base64url(buf: string | Buffer): string {
  return (typeof buf === 'string' ? Buffer.from(buf) : buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export interface AuthService {
  createUser(input: CreateUserInput): PublicUser;
  login(username: string, password: string): { token: string; expiresAt: string; user: PublicUser } | null;
  authenticate(token: string): PublicUser | null;
  logout(token: string): boolean;
  getOnlineUsers(): PublicUser[];
  readonly _users: Map<string, AuthUser>;
  readonly _revokedTokens: Set<string>;
}

export function createAuthService(options: AuthOptions = {}): AuthService {
  const users = new Map<string, AuthUser>();
  const revokedTokens = new Set<string>();
  const activeSessions = new Map<string, { lastSeen: number }>();
  
  const ttlMs = Number(options.sessionTtlMs || 8 * 60 * 60 * 1000);
  if (process.env.NODE_ENV === 'production' && !options.jwtSecret) throw new Error('JWT_SECRET_REQUIRED_IN_PRODUCTION');
  const jwtSecret = options.jwtSecret || crypto.randomBytes(32).toString('hex');
  const issuer = options.issuer ?? process.env.MW_JWT_ISSUER;
  const audience = options.audience ?? process.env.MW_JWT_AUDIENCE;
  const storagePath = options.storagePath ? path.resolve(options.storagePath) : null;
  
  function signJwt(payload: any): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify({ ...payload, exp: Math.floor((Date.now() + ttlMs) / 1000), iat: Math.floor(Date.now() / 1000), jti: crypto.randomUUID(), ...(issuer ? { iss: issuer } : {}), ...(audience ? { aud: audience } : {}) }));
    const signature = base64url(crypto.createHmac('sha256', jwtSecret).update(`${encodedHeader}.${encodedPayload}`).digest());
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  function verifyJwt(token: string): any | null {
    if (revokedTokens.has(token)) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
      const signature = Buffer.from(base64url(crypto.createHmac('sha256', jwtSecret).update(`${parts[0]}.${parts[1]}`).digest()), 'ascii');
      const supplied = Buffer.from(parts[2], 'ascii');
      if (signature.length !== supplied.length || !crypto.timingSafeEqual(signature, supplied)) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const now = Date.now();
      if (typeof payload.exp !== 'number' || payload.exp * 1000 < now) return null;
      if (typeof payload.nbf === 'number' && payload.nbf * 1000 > now) return null;
      if (issuer && payload.iss !== issuer) return null;
      if (audience && payload.aud !== audience) return null;
      return payload;
    } catch { return null; }
  }

  function loadUsers(): void {
    if (!storagePath || !fs.existsSync(storagePath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(storagePath, "utf8"));
      for (const user of Array.isArray(raw?.users) ? raw.users : []) {
        if (user?.username && user?.userId) users.set(user.username, user as AuthUser);
      }
    } catch { /* fail closed: corrupt auth store does not create identities */ }
  }

  function persistUsers(): void {
    if (!storagePath) return;
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    const tmp = `${storagePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, users: [...users.values()] }, null, 2));
    fs.renameSync(tmp, storagePath);
  }

  loadUsers();

  function createUser({ username, password, rid, roles = ["USER"] }: CreateUserInput): PublicUser {
    if (!username || !password) throw new Error("username and password are required");
    if (users.has(username)) throw new Error("user already exists");
    const user: AuthUser = {
      userId: `USR-${crypto.randomUUID()}`,
      username,
      passwordHash: hashPassword(password),
      rid: rid || null,
      roles: [...roles],
      active: true,
      createdAt: new Date().toISOString(),
    };
    users.set(username, user);
    persistUsers();
    return publicUser(user);
  }

  function login(username: string, password: string) {
    const user = users.get(username);
    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) return null;
    
    const expiresAt = Date.now() + ttlMs;
    const token = signJwt({ userId: user.userId, username: user.username, roles: user.roles, rid: user.rid });
    activeSessions.set(user.userId, { lastSeen: Date.now() });
    
    return { token, expiresAt: new Date(expiresAt).toISOString(), user: publicUser(user) };
  }

  function authenticate(token: string) {
    const payload = verifyJwt(token);
    if (!payload || !payload.userId) return null;
    
    let authUser: AuthUser | undefined;
    for (const u of users.values()) {
      if (u.userId === payload.userId) {
        authUser = u;
        break;
      }
    }
    
    if (!authUser || !authUser.active) return null;
    activeSessions.set(payload.userId, { lastSeen: Date.now() });
    
    return publicUser(authUser);
  }

  function logout(token: string): boolean {
    const payload = verifyJwt(token);
    if (payload) revokedTokens.add(token);
    return true;
  }

  function getOnlineUsers(): PublicUser[] {
    const online: PublicUser[] = [];
    const threshold = Date.now() - 5 * 60 * 1000;
    for (const user of users.values()) {
      const session = activeSessions.get(user.userId);
      if (session && session.lastSeen > threshold) {
        online.push(publicUser(user));
      }
    }
    return online;
  }

  function publicUser(user: AuthUser): PublicUser {
    const session = activeSessions.get(user.userId);
    const isOnline = session ? (Date.now() - session.lastSeen < 5 * 60 * 1000) : false;
    return { 
      userId: user.userId, 
      username: user.username, 
      rid: user.rid, 
      roles: [...user.roles], 
      active: user.active,
      lastSeen: session ? new Date(session.lastSeen).toISOString() : undefined,
      isOnline
    };
  }

  return { createUser, login, authenticate, logout, getOnlineUsers, _users: users, _revokedTokens: revokedTokens };
}

export default { createAuthService, hashPassword, verifyPassword };
