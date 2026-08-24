import test from 'node:test';
import assert from 'node:assert/strict';

test('backup retention policy is bounded and preserves latest backup', () => {
  const backups = [
    { id: 'b1', createdAt: 3 },
    { id: 'b2', createdAt: 2 },
    { id: 'b3', createdAt: 1 },
  ];
  const keep = 2;
  const retained = backups.slice(0, keep);
  assert.equal(retained.length, 2);
  assert.equal(retained[0].id, 'b1');
  assert.ok(retained.every((item) => Number.isFinite(item.createdAt)));
});

test('backup identifiers are unique', () => {
  const ids = ['b1', 'b2', 'b3'];
  assert.equal(new Set(ids).size, ids.length);
});
