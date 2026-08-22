// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../../src/access/auth.js';

test('local auth register/login/logout works', () => {
  const auth = createAuthService({ sessionTtlMs: 60_000 });
  const user = auth.createUser({ username: 'ui-user', password: 'secret123', rid: 'RID-UI' });
  assert.equal(user.rid, 'RID-UI');
  const session = auth.login('ui-user', 'secret123');
  assert.ok(session?.token);
  assert.equal(auth.authenticate(session.token)?.username, 'ui-user');
  assert.equal(auth.logout(session.token), true);
  assert.equal(auth.authenticate(session.token), null);
});

test('duplicate register is rejected', () => {
  const auth = createAuthService();
  auth.createUser({ username: 'same', password: 'secret123' });
  assert.throws(() => auth.createUser({ username: 'same', password: 'secret123' }));
});
