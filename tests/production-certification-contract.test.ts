import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

function filesUnder(relative: string): string[] {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(absolute)) {
    const full = path.join(absolute, entry);
    const rel = path.join(relative, entry);
    if (statSync(full).isDirectory()) out.push(...filesUnder(rel));
    else out.push(rel.replaceAll(path.sep, '/'));
  }
  return out;
}

test('N1 concurrency/idempotency boundary is explicitly provisioned', () => {
  const router = read('apps/api/src/router.ts');
  const security = read('docs/SECURITY.md');
  assert.match(router, /idempotencyKey\(req\)/);
  assert.match(security, /serialized in memory so concurrent retries cannot create duplicate/);
  assert.match(security, /Versioned entity updates use optimistic compare-and-swap semantics/);
});

test('N2 PostgreSQL durability/recovery surfaces are explicit and restore is offline-only', () => {
  const api = read('apps/api/src/app.ts');
  const packageJson = read('package.json');
  const security = read('docs/SECURITY.md');
  assert.match(api, /persistenceDriver === 'postgres'/);
  assert.match(api, /PostgresWitnessProjectionStore/);
  assert.match(packageJson, /test:postgres/);
  assert.match(security, /Runtime restore is not exposed over HTTP/);
});

test('N3 rate-limit and production disclosure boundaries are documented', () => {
  const security = read('docs/SECURITY.md');
  const api = read('apps/api/src/app.ts');
  assert.match(security, /distinct bounded rate-limit buckets/);
  assert.match(security, /Public production health exposes only status and release/);
  assert.match(api, /MW_REQUEST_TIMEOUT_MS/);
  assert.match(api, /MW_MAX_REQUESTS_PER_SOCKET/);
});

test('N4 witness key custody/rotation is bounded to encrypted local keystore semantics', () => {
  const security = read('docs/SECURITY.md');
  const api = read('apps/api/src/app.ts');
  const witnessFiles = filesUnder('apps/api/src/routes').filter((file) => file.includes('witness'));
  assert.match(security, /AES-256-GCM encrypted local keystore/);
  assert.match(security, /scrypt/);
  assert.match(security, /ACTIVE\`, \`SUPERSEDED\`, or \`REVOKED/);
  assert.match(api, /SingleNodeWitnessKeyStore/);
  assert.ok(witnessFiles.length > 0);
});

test('N5 deployment security certification has explicit prerequisites instead of implicit production claims', () => {
  const security = read('docs/SECURITY.md');
  const app = read('apps/api/src/app.ts');
  assert.match(security, /Production must supply a stable managed signing secret/);
  assert.match(security, /application database roles do not receive schema-creation privileges/);
  assert.match(app, /JWT_SECRET_MUST_BE_32_CHARS_AND_NON_DEFAULT_IN_PRODUCTION/);
  assert.match(app, /MW_COOKIE_SAME_SITE_INVALID/);
});

test('N6 CAB/XRP/Flow are separate application surfaces with distinct certification targets', () => {
  for (const app of ['apps/cab', 'apps/xrp', 'apps/flow']) assert.equal(existsSync(path.join(root, app)), true, app);
  const docs = read('docs/ROADMAP_TODO.md');
  assert.match(docs, /N6 Separate CAB \/ XRP \/ Flow production certification/);
  const api = read('docs/API.md');
  assert.match(api, /Flow is a separate governed application/);
  assert.match(api, /XRP RID workspace projection/);
});
