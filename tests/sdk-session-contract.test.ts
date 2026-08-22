import test from 'node:test';
import assert from 'node:assert/strict';
import { UniverseApiError, UniverseClient, UniverseContractError } from '../packages/sdk/src/index.js';

const user = { userId: 'USR-1', username: 'sdk-user', rid: 'MW-SDK-1', roles: ['USER'], active: true };
const session = { protocol: 'MW_AUTH_SESSION_V1' as const, transport: 'bearer' as const, token: 'access-1', accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: '2099-01-01T00:00:00.000Z', refreshExpiresAt: '2099-02-01T00:00:00.000Z', sessionId: 'SESSION-1', user };

test('SDK owns bearer session lifecycle and validates login', async () => {
  const seen: Array<{ url: string; authorization: string | null; mode: string | null }> = [];
  const client = new UniverseClient({
    baseUrl: 'http://example',
    fetchImpl: async (input, init) => {
      const headers = new Headers(init?.headers);
      seen.push({ url: String(input), authorization: headers.get('authorization'), mode: headers.get('x-mw-auth-mode') });
      if (String(input).endsWith('/api/v1/auth/login')) return Response.json(session);
      if (String(input).endsWith('/api/v1/auth/me')) return Response.json(user);
      if (String(input).endsWith('/api/v1/auth/logout')) return Response.json({ ok: true });
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    },
  });
  await client.login({ username: 'sdk-user', password: 'long-password-123' });
  assert.equal(client.getSession()?.refreshToken, 'refresh-1');
  assert.equal((await client.me()).rid, 'MW-SDK-1');
  assert.equal(seen[1].authorization, 'Bearer access-1');
  assert.equal(seen[0].mode, 'bearer');
  assert.equal((await client.logout()).ok, true);
  assert.equal(client.getSession(), null);
});

test('SDK retries GET and idempotent command but never retries unsafe analysis', async () => {
  let getAttempts = 0;
  let commandAttempts = 0;
  let analysisAttempts = 0;
  const client = new UniverseClient({
    baseUrl: 'http://example',
    maxRetries: 2,
    fetchImpl: async (input, init) => {
      const url = String(input);
      if (url.includes('/resource/')) {
        getAttempts += 1;
        if (getAttempts === 1) return Response.json({ error: 'UNAVAILABLE' }, { status: 503 });
        return Response.json({ id: 'R-1', kind: 'RESOURCE', entity: { id: 'R-1' } });
      }
      if (url.endsWith('/command')) {
        commandAttempts += 1;
        assert.ok(new Headers(init?.headers).get('idempotency-key'));
        if (commandAttempts === 1) return Response.json({ error: 'UNAVAILABLE' }, { status: 503 });
        return Response.json({ id: 'C-1', kind: 'COMMAND', status: 'CREATED' });
      }
      if (url.endsWith('/analyze')) {
        analysisAttempts += 1;
        return Response.json({ error: 'UNAVAILABLE' }, { status: 503 });
      }
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    },
  });
  assert.equal((await client.resource('R-1')).id, 'R-1');
  assert.equal((await client.command({ command: 'CREATE_ENTITY', payload: {} })).id, 'C-1');
  await assert.rejects(client.analyze({ text: 'unsafe retry test' }), (error: unknown) => error instanceof UniverseApiError && error.status === 503);
  assert.equal(getAttempts, 2);
  assert.equal(commandAttempts, 2);
  assert.equal(analysisAttempts, 1);
});

test('SDK rejects malformed successful evaluation responses', async () => {
  const client = new UniverseClient({ baseUrl: 'http://example', fetchImpl: async () => Response.json({ id: 'E-1', kind: 'EVALUATION', status: 'RESOLVED' }) });
  await assert.rejects(client.evaluate({ text: 'contract test' }), (error: unknown) => error instanceof UniverseContractError);
});

test('SDK refreshes once after a 401 and retries the original request', async () => {
  let meAttempts = 0;
  const refreshed = { ...session, token: 'access-2', accessToken: 'access-2', refreshToken: 'refresh-2' };
  const client = new UniverseClient({
    baseUrl: 'http://example',
    session,
    fetchImpl: async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) return Response.json(refreshed);
      if (url.endsWith('/auth/me')) {
        meAttempts += 1;
        if (meAttempts === 1) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer access-2');
        return Response.json(user);
      }
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    },
  });
  assert.equal((await client.me()).username, 'sdk-user');
  assert.equal(meAttempts, 2);
  assert.equal(client.getSession()?.refreshToken, 'refresh-2');
});
