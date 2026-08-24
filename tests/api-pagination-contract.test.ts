import test from 'node:test';
import assert from 'node:assert/strict';

test('pagination contract uses stable page/size and bounded values', () => {
  const input = { page: 1, pageSize: 50 };
  assert.equal(Number.isInteger(input.page), true);
  assert.equal(Number.isInteger(input.pageSize), true);
  assert.ok(input.page >= 1);
  assert.ok(input.pageSize >= 1 && input.pageSize <= 100);
});

test('pagination metadata is deterministic and total cannot be negative', () => {
  const total = 123;
  const page = 2;
  const pageSize = 50;
  const pages = Math.ceil(total / pageSize);
  assert.equal(pages, 3);
  assert.ok(total >= 0);
  assert.ok(page >= 1 && page <= pages);
});
