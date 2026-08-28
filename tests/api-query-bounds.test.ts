import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_FILTER_LENGTH, MAX_LIST_LIMIT, MAX_LIST_OFFSET, boundedFilter, boundedInteger, listQueryBounds, queryFilters } from '../apps/api/src/query-bounds.js';

test('pagination accepts only bounded safe integers', () => {
  assert.deepEqual(boundedInteger(undefined, 50, 1, MAX_LIST_LIMIT), { ok: true, value: 50 });
  assert.deepEqual(boundedInteger('250', 50, 1, MAX_LIST_LIMIT), { ok: true, value: 250 });
  for (const value of ['0', '-1', '1.2', 'Infinity', '1e9', '251', Number.MAX_SAFE_INTEGER + 1]) {
    assert.deepEqual(boundedInteger(value, 50, 1, MAX_LIST_LIMIT), { ok: false, code: 'INVALID_PAGINATION' }, String(value));
  }
});

test('list bounds reject offset abuse instead of silently coercing it', () => {
  assert.deepEqual(listQueryBounds(new URLSearchParams('offset=12'), '20', 50), { ok: true, value: { limit: 20, offset: 12 } });
  for (const query of ['offset=-1', 'offset=2.5', `offset=${MAX_LIST_OFFSET + 1}`]) {
    assert.deepEqual(listQueryBounds(new URLSearchParams(query), '20', 50), { ok: false, code: 'INVALID_PAGINATION' }, query);
  }
});

test('filters are bounded, normalized, and control-character safe', () => {
  assert.deepEqual(boundedFilter('  accountability  '), { ok: true, value: 'accountability' });
  for (const value of [`${'x'.repeat(MAX_FILTER_LENGTH + 1)}`, 'a\u0000b', 3]) {
    assert.deepEqual(boundedFilter(value), { ok: false, code: 'INVALID_FILTER' });
  }
});

test('unsupported sort keys fail closed rather than being silently ignored', () => {
  assert.deepEqual(queryFilters({}, new URLSearchParams('sort=createdAt')), { ok: false, code: 'UNSUPPORTED_SORT' });
  assert.deepEqual(queryFilters({ query: 'mercy', type: 'CASE' }, new URLSearchParams()), { ok: true, value: { q: 'mercy', type: 'CASE', entityId: undefined } });
});
