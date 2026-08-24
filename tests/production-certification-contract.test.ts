import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
const readJson = <T>(relative: string): T => JSON.parse(read(relative)) as T;

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

const router = read('apps/api/src/router.ts');
const app = read('apps/api/src/app.ts');
const kernelRoutes = read('apps/api/src/routes/kernel.routes.ts');
const persistenceTypes = read('packages/persistence/src/types.ts');
const persistenceMemory = read('packages/persistence/src/memory.ts');
const cab = readJson<{ name: string; version?: string; scripts?: Record<string, string> }>('apps/cab/package.json');
const xrp = readJson<{ name: string; version?: string; scripts?: Record<string, string> }>('apps/xrp/package.json');
const flow = readJson<{ name: string; version?: string; scripts?: Record<string, string> }>('apps/flow/package.json');
const witnessKeystore = read('src/ledger/single-node-keystore.ts');
const witnessRoutes = filesUnder('apps/api/src/routes').filter((file) => file.includes('witness'));
const rootPackage = existsSync(path.join(root, 'package.json')) ? readJson<{ scripts?: Record<string, string> }>('package.json') : {};
const postgresScript = rootPackage.scripts?.['test:postgres'] ?? '';


test('N1 concurrency/idempotency boundary is explicitly provisioned', () => {
  assert.match(router, /function\s+idempotencyKey\s*\(\s*req\s*:/);
  assert.match(router, /idempotency-key/);
  assert.match(persistenceTypes, /expectedVersion\?:\s*number/);
  assert.match(persistenceTypes, /compare-and-swap/i);
  assert.match(persistenceMemory, /entity\.expectedVersion/);
  assert.match(persistenceMemory, /ENTITY_VERSION_CONFLICT/);
});

test('N2 PostgreSQL durability/recovery surfaces are explicit and restore is offline-only', () => {
  assert.match(app, /persistenceDriver\s*===\s*['"]postgres['"]/);
  assert.match(app, /PostgresWitnessProjectionStore/);
  assert.ok(postgresScript.includes('persistence:migration:test') || existsSync(path.join(root, 'scripts/postgres-smoke.ts')));
  assert.match(app, /restore|backup/i);
  assert.doesNotMatch(app, /restore.*\/api\/v1|\/api\/v1.*restore/i);
});

test('N3 rate-limit and production disclosure boundaries are implemented', () => {
  assert.match(app, /rate.?limit|rateLimit|MW_RATE/i);
  assert.match(app, /MW_REQUEST_TIMEOUT_MS/);
  assert.match(app, /MW_MAX_REQUESTS_PER_SOCKET/);
  assert.match(kernelRoutes, /release/);
  assert.match(app, /NODE_ENV.*production/);
});

test('N4 witness key custody/rotation is bounded to encrypted local keystore semantics', () => {
  assert.match(app, /SingleNodeWitnessKeyStore/);
  assert.match(app, /witnessKeyStore/);
  assert.match(app, /refreshTransportIdentity/);
  assert.match(app, /persistKeys/);
  assert.match(witnessKeystore, /aes-256-gcm/);
  assert.match(witnessKeystore, /scryptSync/);
  assert.match(witnessKeystore, /async rotate\(/);
  assert.match(witnessKeystore, /async revoke\(/);
  assert.ok(witnessRoutes.length > 0);
  const witnessRouteText = witnessRoutes.map(read).join('\n');
  assert.match(witnessRouteText, /backup|diagnostic|status/i);
});

test('N5 deployment security certification has explicit prerequisites in runtime code', () => {
  assert.match(app, /JWT_SECRET/);
  assert.match(app, /32/);
  assert.match(app, /SAME_SITE|SameSite|sameSite/);
  assert.match(app, /production/);
});

test('N6 CAB/XRP/Flow are separate application surfaces with distinct certification targets', () => {
  for (const dir of ['apps/cab', 'apps/xrp', 'apps/flow']) assert.equal(existsSync(path.join(root, dir)), true, dir);
  for (const pkg of [cab, xrp, flow]) {
    assert.ok(pkg.name);
    assert.equal(pkg.version, '4.33.0');
    assert.ok(pkg.scripts?.build);
  }
  assert.notEqual(cab.name, xrp.name);
  assert.notEqual(cab.name, flow.name);
  assert.notEqual(xrp.name, flow.name);
});
