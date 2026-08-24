import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPermission, hasPermission } from '../src/security/authorization.js';

test('authorization matrix denies unknown actions by default', () => {
  assert.equal(hasPermission('UNKNOWN' as never, { rid: 'RID-1', roles: [] } as never), false);
  assert.throws(() => assertPermission('UNKNOWN' as never, { rid: 'RID-1', roles: [] } as never), /FORBIDDEN|UNAUTHORIZED|DENIED/i);
});

test('authorization matrix grants an explicitly allowed action only', () => {
  const subject = { rid: 'RID-1', roles: ['ADMIN'] } as never;
  for (const action of ['READ', 'WRITE', 'REVIEW', 'WITNESS'] as never[]) {
    const result = hasPermission(action, subject);
    assert.equal(typeof result, 'boolean');
    if (result) assert.doesNotThrow(() => assertPermission(action, subject));
  }
});
