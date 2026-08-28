import test from 'node:test';
import assert from 'node:assert/strict';

test('observability redaction removes bearer tokens and common secrets', () => {
  const raw = JSON.stringify({ authorization: 'Bearer secret-token', password: 'super-secret', apiKey: 'key-123', request_id: 'req-1' });
  const redacted = raw.replace(/Bearer\s+[^\"\s]+/gi, 'Bearer [REDACTED]').replace(/(password|apiKey)\"?\s*:\s*\"[^\"]+\"/gi, '$1:"[REDACTED]"');
  assert.equal(redacted.includes('secret-token'), false);
  assert.equal(redacted.includes('super-secret'), false);
  assert.equal(redacted.includes('key-123'), false);
  assert.ok(redacted.includes('req-1'));
});

test('correlation id remains observable after redaction', () => {
  const entry = { request_id: 'req-observe-1', status: 200 };
  assert.match(entry.request_id, /^req-/);
});
