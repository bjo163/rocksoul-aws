import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAuthService } from '../src/access/auth.js';
import { assertApiResponseContract, ContractValidationError } from '../packages/contracts/src/index.js';

test('file auth persists sessions, rotates refresh tokens, and persists revocation', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-auth-session-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const storagePath = path.join(dir, 'auth-users.json');
  const jwtSecret = 'test-session-secret-that-is-longer-than-32-characters';

  const first = createAuthService({ storagePath, jwtSecret, sessionTtlMs: 60_000, refreshTtlMs: 600_000 });
  first.createUser({ username: 'session-user', password: 'long-password-123', rid: 'MW-SESSION-1' });
  const login = first.login('session-user', 'long-password-123');
  assert.ok(login);
  assert.equal(login.protocol, 'MW_AUTH_SESSION_V1');
  assert.equal(first.authenticate(login.accessToken)?.rid, 'MW-SESSION-1');

  const restarted = createAuthService({ storagePath, jwtSecret, sessionTtlMs: 60_000, refreshTtlMs: 600_000 });
  assert.equal(restarted.authenticate(login.accessToken)?.username, 'session-user');
  const rotated = restarted.refresh(login.refreshToken);
  assert.ok(rotated);
  assert.notEqual(rotated.refreshToken, login.refreshToken);
  assert.equal(restarted.refresh(login.refreshToken), null, 'rotated refresh token cannot be replayed');
  assert.equal(restarted.logout(rotated.accessToken), true);

  const afterLogout = createAuthService({ storagePath, jwtSecret, sessionTtlMs: 60_000, refreshTtlMs: 600_000 });
  assert.equal(afterLogout.authenticate(rotated.accessToken), null, 'revocation survives process restart');
  assert.equal(afterLogout.refresh(rotated.refreshToken), null, 'revoked session cannot refresh');
});

test('revokeAll invalidates every session for one RID user', () => {
  const auth = createAuthService({ jwtSecret: 'test-session-secret-that-is-longer-than-32-characters' });
  const user = auth.createUser({ username: 'multi-session', password: 'long-password-456', rid: 'MW-SESSION-2' });
  const first = auth.login('multi-session', 'long-password-456');
  const second = auth.login('multi-session', 'long-password-456');
  assert.ok(first && second);
  assert.equal(auth.revokeAll(user.userId), 2);
  assert.equal(auth.authenticate(first.accessToken), null);
  assert.equal(auth.authenticate(second.accessToken), null);
});

test('runtime contracts reject malformed success payloads', () => {
  assert.throws(
    () => assertApiResponseContract('POST', '/api/v1/auth/login', { token: 'unvalidated' }),
    (error: unknown) => error instanceof ContractValidationError && error.contract === 'AuthSession',
  );
  assert.throws(
    () => assertApiResponseContract('POST', '/api/v1/evaluate', { id: 'E-1', kind: 'EVALUATION', status: 'RESOLVED' }),
    (error: unknown) => error instanceof ContractValidationError && error.contract === 'EvaluationResult',
  );
});
