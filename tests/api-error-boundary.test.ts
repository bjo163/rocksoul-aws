import test from 'node:test';
import assert from 'node:assert/strict';
import { httpError } from '../apps/api/src/router.js';

test('httpError exposes diagnostics outside production', () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'test';
    assert.deepEqual(httpError(500, 'INTERNAL_FAILURE', 'database detail').body, {
      error: 'INTERNAL_FAILURE',
      message: 'database detail',
    });
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test('httpError redacts diagnostics in production', () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.deepEqual(httpError(500, 'INTERNAL_FAILURE', 'database detail').body, {
      error: 'INTERNAL_FAILURE',
    });
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
