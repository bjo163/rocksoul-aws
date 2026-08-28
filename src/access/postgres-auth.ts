import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { hashPassword, verifyPassword, type AuthService, type AuthSession, type AuthUser, type CreateUserInput, type PublicUser, type SessionRecord } from './auth.js';
import { createRefreshToken, hashOpaqueToken, signAccessToken, verifyAccessToken } from './session-token.js';

interface PgResult { rows: any[]; rowCount?: number }
interface PgPool { query(sql: string, params?: unknown[]): Promise<PgResult>; end(): Promise<void> }
const require = createRequire(import.meta.url);
function getPool(): PgPool { const pg = require('pg'); return new pg.Pool(); }

export class PostgresAuthService implements AuthService {
  private readonly pool: PgPool;
  readonly _users = new Map<string, AuthUser>();
  readonly _revokedTokens = new Set<string>();
  readonly _sessions = new Map<string, SessionRecord>();
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;
  private readonly secret: string;
  private readonly issuer?: string;
  private readonly audience?: string;

  private constructor(options: { sessionTtlMs: number; refreshTtlMs: number; jwtSecret: string; issuer?: string; audience?: string }) {
    this.pool = getPool();
    this.accessTtlMs = options.sessionTtlMs;
    this.refreshTtlMs = options.refreshTtlMs;
    this.secret = options.jwtSecret;
    this.issuer = options.issuer;
    this.audience = options.audience;
  }

  static async create(options: { sessionTtlMs?: number; refreshTtlMs?: number; jwtSecret: string; issuer?: string; audience?: string }): Promise<PostgresAuthService> {
    const service = new PostgresAuthService({
      sessionTtlMs: options.sessionTtlMs ?? Number(process.env.MW_ACCESS_TOKEN_TTL_MS ?? 15 * 60 * 1000),
      refreshTtlMs: options.refreshTtlMs ?? Number(process.env.MW_REFRESH_TOKEN_TTL_MS ?? 30 * 24 * 60 * 60 * 1000),
      jwtSecret: options.jwtSecret,
      issuer: options.issuer ?? process.env.MW_JWT_ISSUER,
      audience: options.audience ?? process.env.MW_JWT_AUDIENCE,
    });
    const users = await service.pool.query('SELECT * FROM auth_users ORDER BY username');
    for (const row of users.rows) service._users.set(row.username, service.userFromRow(row));
    const revoked = await service.pool.query('SELECT token_hash FROM auth_revoked_tokens');
    for (const row of revoked.rows) service._revokedTokens.add(row.token_hash);
    const sessions = await service.pool.query('SELECT * FROM auth_sessions WHERE refresh_expires_at > NOW() ORDER BY created_at');
    for (const row of sessions.rows) service._sessions.set(row.session_id, service.sessionFromRow(row));
    return service;
  }

  private userFromRow(row: any): AuthUser {
    return { userId: row.user_id, username: row.username, passwordHash: row.password_hash, rid: row.rid ?? null, roles: Array.isArray(row.roles_json) ? row.roles_json : [], active: row.active === true, createdAt: new Date(row.created_at).toISOString() };
  }

  private sessionFromRow(row: any): SessionRecord {
    return { sessionId: row.session_id, userId: row.user_id, refreshTokenHash: row.refresh_token_hash, createdAt: new Date(row.created_at).toISOString(), refreshExpiresAt: new Date(row.refresh_expires_at).toISOString(), lastSeen: new Date(row.last_seen_at).toISOString(), revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : undefined, rotationCounter: Number(row.rotation_counter ?? 1) };
  }

  private findUserById(userId: string): AuthUser | undefined {
    return [...this._users.values()].find((user) => user.userId === userId);
  }

  private publicUser(user: AuthUser): PublicUser {
    const session = [...this._sessions.values()].filter((item) => item.userId === user.userId && !item.revokedAt && Date.parse(item.refreshExpiresAt) > Date.now()).sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen))[0];
    return { userId: user.userId, username: user.username, rid: user.rid, roles: [...user.roles], active: user.active, lastSeen: session?.lastSeen, isOnline: session ? Date.now() - Date.parse(session.lastSeen) < 5 * 60 * 1000 : false };
  }

  private accessSession(user: AuthUser, session: SessionRecord, refreshToken: string): AuthSession {
    const access = signAccessToken({ secret: this.secret, ttlMs: this.accessTtlMs, sessionId: session.sessionId, userId: user.userId, username: user.username, roles: user.roles, rid: user.rid, issuer: this.issuer, audience: this.audience });
    return { protocol: 'MW_AUTH_SESSION_V1', token: access.token, accessToken: access.token, refreshToken, expiresAt: access.expiresAt, refreshExpiresAt: session.refreshExpiresAt, sessionId: session.sessionId, user: this.publicUser(user) };
  }

  async createUser(input: CreateUserInput): Promise<PublicUser> {
    if (!input.username || !input.password) throw new Error('username and password are required');
    if (this._users.has(input.username)) throw new Error('user already exists');
    const user: AuthUser = { userId: `USR-${crypto.randomUUID()}`, username: input.username, passwordHash: hashPassword(input.password), rid: input.rid ?? null, roles: [...(input.roles ?? ['USER'])], active: true, createdAt: new Date().toISOString() };
    await this.pool.query('INSERT INTO auth_users(user_id,username,password_hash,rid,roles_json,active,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)', [user.userId, user.username, user.passwordHash, user.rid, JSON.stringify(user.roles), true, user.createdAt]);
    this._users.set(user.username, user);
    return this.publicUser(user);
  }

  async assignRid(userId: string, rid: string): Promise<PublicUser> {
    const normalized = rid.trim();
    if (!normalized) throw new Error('RID_REQUIRED');
    const user = this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.rid && user.rid !== normalized) throw new Error('RID_ALREADY_BOUND');
    if (user.rid === normalized) return this.publicUser(user);
    const result = await this.pool.query('UPDATE auth_users SET rid=$1 WHERE user_id=$2 AND rid IS NULL RETURNING *', [normalized, userId]);
    if (!result.rows[0]) throw new Error('RID_BINDING_CONFLICT');
    const updated = this.userFromRow(result.rows[0]);
    this._users.set(updated.username, updated);
    await this.revokeAll(userId);
    return this.publicUser(updated);
  }

  async login(username: string, password: string): Promise<AuthSession | null> {
    // Always query DB for fresh user data — no restart needed after auth:bootstrap
    const result = await this.pool.query('SELECT * FROM auth_users WHERE username=$1 AND active=true LIMIT 1', [username]);
    const row = result.rows[0];
    if (!row) return null;
    const user = this.userFromRow(row);
    if (!verifyPassword(password, user.passwordHash)) return null;
    this._users.set(user.username, user); // update cache for session lookups
    const refreshToken = createRefreshToken();
    const now = new Date();
    const session: SessionRecord = { sessionId: crypto.randomUUID(), userId: user.userId, refreshTokenHash: hashOpaqueToken(refreshToken), createdAt: now.toISOString(), refreshExpiresAt: new Date(now.getTime() + this.refreshTtlMs).toISOString(), lastSeen: now.toISOString(), rotationCounter: 1 };
    await this.pool.query('INSERT INTO auth_sessions(session_id,user_id,refresh_token_hash,created_at,refresh_expires_at,last_seen_at,rotation_counter) VALUES($1,$2,$3,$4,$5,$6,$7)', [session.sessionId, session.userId, session.refreshTokenHash, session.createdAt, session.refreshExpiresAt, session.lastSeen, session.rotationCounter]);
    this._sessions.set(session.sessionId, session);
    return this.accessSession(user, session, refreshToken);
  }

  async refresh(refreshToken: string): Promise<AuthSession | null> {
    if (!refreshToken) return null;
    const oldHash = hashOpaqueToken(refreshToken);
    const nextRefreshToken = createRefreshToken();
    const nextHash = hashOpaqueToken(nextRefreshToken);
    const now = new Date().toISOString();
    const result = await this.pool.query(`UPDATE auth_sessions SET refresh_token_hash=$1,last_seen_at=$2,rotation_counter=rotation_counter+1 WHERE refresh_token_hash=$3 AND revoked_at IS NULL AND refresh_expires_at>NOW() RETURNING *`, [nextHash, now, oldHash]);
    const row = result.rows[0];
    if (!row) return null;
    const session = this.sessionFromRow(row);
    const user = this.findUserById(session.userId);
    if (!user || !user.active) { await this.revokeAll(session.userId); return null; }
    this._sessions.set(session.sessionId, session);
    return this.accessSession(user, session, nextRefreshToken);
  }

  async authenticate(token: string): Promise<PublicUser | null> {
    if (!token || this._revokedTokens.has(hashOpaqueToken(token))) return null;
    const claims = verifyAccessToken(token, { secret: this.secret, issuer: this.issuer, audience: this.audience });
    if (!claims) return null;
    const result = await this.pool.query('UPDATE auth_sessions SET last_seen_at=NOW() WHERE session_id=$1 AND user_id=$2 AND revoked_at IS NULL AND refresh_expires_at>NOW() RETURNING *', [claims.sid, claims.userId]);
    const row = result.rows[0];
    if (!row) return null;
    const session = this.sessionFromRow(row);
    this._sessions.set(session.sessionId, session);
    // Refresh user from DB to pick up role/RID changes without restart
    const userResult = await this.pool.query('SELECT * FROM auth_users WHERE user_id=$1 LIMIT 1', [claims.userId]);
    const user = userResult.rows[0] ? this.userFromRow(userResult.rows[0]) : null;
    if (user) this._users.set(user.username, user);
    return user?.active ? this.publicUser(user) : null;
  }

  async logout(tokenOrRefreshToken: string): Promise<boolean> {
    if (!tokenOrRefreshToken) return true;
    const claims = verifyAccessToken(tokenOrRefreshToken, { secret: this.secret, issuer: this.issuer, audience: this.audience });
    const tokenHash = hashOpaqueToken(tokenOrRefreshToken);
    const result = claims
      ? await this.pool.query('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW()) WHERE session_id=$1 RETURNING *', [claims.sid])
      : await this.pool.query('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW()) WHERE refresh_token_hash=$1 RETURNING *', [tokenHash]);
    for (const row of result.rows) this._sessions.set(row.session_id, this.sessionFromRow(row));
    if (claims) {
      this._revokedTokens.add(tokenHash);
      await this.pool.query('INSERT INTO auth_revoked_tokens(token_hash,revoked_at) VALUES($1,$2) ON CONFLICT(token_hash) DO NOTHING', [tokenHash, new Date().toISOString()]);
    }
    return true;
  }

  async revokeAll(userId: string): Promise<number> {
    const result = await this.pool.query('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW()) WHERE user_id=$1 AND revoked_at IS NULL RETURNING *', [userId]);
    for (const row of result.rows) this._sessions.set(row.session_id, this.sessionFromRow(row));
    return result.rows.length;
  }

  async getOnlineUsers(): Promise<PublicUser[]> {
    const result = await this.pool.query(`SELECT DISTINCT ON (user_id) * FROM auth_sessions WHERE revoked_at IS NULL AND refresh_expires_at>NOW() AND last_seen_at>NOW()-INTERVAL '5 minutes' ORDER BY user_id,last_seen_at DESC`);
    for (const row of result.rows) this._sessions.set(row.session_id, this.sessionFromRow(row));
    return result.rows.map((row) => this.findUserById(row.user_id)).filter((user): user is AuthUser => Boolean(user?.active)).map((user) => this.publicUser(user));
  }

  async close(): Promise<void> { await this.pool.end(); }
}
