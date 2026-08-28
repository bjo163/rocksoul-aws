import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../src/access/auth.js';

test('refresh token rotation rejects replay', () => {
  const auth = createAuthService({ jwtSecret: 'auth-replay-contract-secret-longer-than-32' });
  auth.createUser({ username: 'replay-test', password: 'strong-password-123', rid: 'RID-REPLAY' });
  const session = auth.login('replay-test', 'strong-password-123');
  assert.ok(session);
  const rotated = auth.refresh(session.refreshToken);
  assert.ok(rotated);
  assert.equal(auth.refresh(session.refreshToken), null);
});

test('logout invalidates access token', () => {
  const auth = createAuthService({ jwtSecret: 'auth-replay-contract-secret-longer-than-32' });
  auth.createUser({ username: 'logout-test', password: 'strong-password-123', rid: 'RID-LOGOUT' });
  const session = auth.login('logout-test', 'strong-password-123');
  assert.ok(session);
  assert.equal(auth.logout(session.accessToken), true);
  assert.equal(auth.authenticate(session.accessToken), null);
});
