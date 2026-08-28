import test from 'node:test';
import assert from 'node:assert/strict';
import { UniverseApiError, UniverseClient } from '../packages/sdk/src/index.js';

type RequestCapableClient = {
  request<T>(path: string, init: RequestInit): Promise<T>;
};

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('SDK retries idempotent GET requests and preserves request contract', async () => {
  let calls = 0;
  const client = new UniverseClient({ baseUrl: 'https://api.example.test', maxRetries: 2, fetchImpl: async () => {
    calls += 1;
    return calls === 1 ? response(503, { error: 'TEMPORARY' }) : response(200, { protocol: 'HEALTH_V1', ok: true });
  } });
  const requester = client as unknown as RequestCapableClient;
  const result = await requester.request<{ ok: boolean }>('/api/v1/health', { method: 'GET' });
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
});

test('SDK does not blindly retry non-idempotent POST without idempotency key', async () => {
  let calls = 0;
  const client = new UniverseClient({ baseUrl: 'https://api.example.test', maxRetries: 3, fetchImpl: async () => {
    calls += 1;
    return response(503, { error: 'TEMPORARY' });
  } });
  const requester = client as unknown as RequestCapableClient;
  await assert.rejects(
    () => requester.request('/api/v1/command', { method: 'POST', body: '{}' }),
    (error: unknown) => error instanceof UniverseApiError && error.status === 503,
  );
  assert.equal(calls, 1);
});

test('SDK exposes the documented health, readiness, and feature discovery operations', async () => {
  const client = new UniverseClient({ baseUrl: 'https://api.example.test', fetchImpl: async (input) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith('/health')) return response(200, { status: 'ok', release: '4.33.0' });
    if (path.endsWith('/ready')) return response(200, { status: 'ready', release: '4.33.0' });
    return response(200, { fastify: false });
  } });
  assert.equal((await client.health()).status, 'ok');
  assert.equal((await client.ready()).status, 'ready');
  assert.equal((await client.features()).fastify, false);
});
