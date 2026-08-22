import assert from 'node:assert/strict';
import { UniverseClient } from '../../packages/sdk/src/index.js';
const mock: typeof fetch = async (url) => new Response(JSON.stringify({ ok: true, url: String(url) }), { status: 200 });
const client = new UniverseClient({ baseUrl: 'http://example', fetchImpl: mock });
for (const fn of [client.observe, client.analyze, client.evaluate, client.query, client.command]) assert.equal(typeof fn, 'function');
assert.equal((await client.resource('E1')).ok, true);
console.log('SDK_SURFACE_PASS');
