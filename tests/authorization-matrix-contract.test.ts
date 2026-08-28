import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPermission, hasPermission, permissionsForRoles } from '../src/security/authorization.js';

const user = (roles: string[]) => ({ userId: 'AUTH-MATRIX', username: 'matrix', roles, rid: null, active: true });

test('authorization matrix denies unknown actions by default', () => {
  assert.equal(hasPermission(user([]), 'ADMIN'), false);
  assert.throws(() => assertPermission(user([]), 'ADMIN'), /PERMISSION_DENIED/);
});

test('authorization matrix matches the role capability contract', () => {
  assert.deepEqual(permissionsForRoles(['USER']), ['OBSERVE', 'ANALYZE']);
  assert.deepEqual(permissionsForRoles(['REVIEWER']), ['OBSERVE', 'ANALYZE', 'EVALUATE', 'READ_AUDIT']);
  assert.deepEqual(permissionsForRoles(['OPERATOR']), ['OBSERVE', 'ANALYZE', 'COMMAND']);
  assert.deepEqual(permissionsForRoles(['ADMIN']), ['OBSERVE', 'ANALYZE', 'EVALUATE', 'COMMAND', 'ADMIN', 'READ_AUDIT']);
  assert.equal(hasPermission(user(['USER']), 'COMMAND'), false);
  assert.equal(hasPermission(user(['OPERATOR']), 'COMMAND'), true);
  assert.equal(hasPermission(user(['REVIEWER']), 'EVALUATE'), true);
  assert.equal(hasPermission(user(['ADMIN']), 'ADMIN'), true);
  assert.equal(hasPermission({ ...user(['ADMIN']), active: false }, 'ADMIN'), false);
});
