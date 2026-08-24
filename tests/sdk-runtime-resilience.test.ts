import test from 'node:test';
import assert from 'node:assert/strict';
import { UniverseApiError, UniverseClient } from '../packages/sdk/src/index.js';

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('SDK retries idempotent GET requests and preserves request contract', async () => {
  let calls = 0;
  const client = new UniverseClient({ baseUrl: 'https://api.example.test', maxRetries: 2, fetchImpl: async () => {
    calls += 1;
    return calls === 1 ? response(503, { error: 'TEMPORARY' }) : response(200, { protocol: 'HEALTH_V1', ok: true });
  } });
  const result = await (client as any).request('/api/v1/health', { method: 'GET' });
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
});

test('SDK does not blindly retry non-idempotent POST without idempotency key', async () => {
  let calls = 0;
  const client = new UniverseClient({ baseUrl: 'https://api.example.test', maxRetries: 3, fetchImpl: async () => {
    calls += 1;
    return response(503, { error: 'TEMPORARY' });
  } });
  await assert.rejects(() => (client as any).request('/api/v1/command', { method: 'POST', body: '{}' }), (error: unknown) => error instanceof UniverseApiError && error.status === 503);
  assert.equal(calls, 1);
});
