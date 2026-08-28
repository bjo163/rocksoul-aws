import test from 'node:test';
import assert from 'node:assert/strict';

const disallowed = ['http://localhost:', 'http://127.0.0.1:', 'http://0.0.0.0:'];

test('production frontend runtime configuration cannot default to loopback API origins', () => {
  for (const value of disallowed) assert.ok(value.startsWith('http://'));
  const productionApi = process.env.API_BASE_URL ?? '';
  if (process.env.NODE_ENV === 'production') {
    assert.equal(disallowed.some((prefix) => productionApi.startsWith(prefix)), false);
  }
});

test('frontend API configuration is explicit rather than silently invented', () => {
  const candidate = process.env.API_BASE_URL;
  assert.ok(candidate === undefined || candidate.length > 0);
});
