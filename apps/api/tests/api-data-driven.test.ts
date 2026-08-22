import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../src/app.js';
import { createAuthService } from '../../../src/access/auth.js';

process.env.NODE_ENV = 'test';

// Read all JSON files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Keep this suite scoped to the files owned by generate-test-cases.js. The
// semantic generator writes a different matrix in the same directory and
// must not silently expand this API suite with stale or unrelated cases.
const caseFiles = [
  'test-cases-auth.json',
  'test-cases-kernel.json',
  'test-cases-entities.json',
  'test-cases-commands.json',
  'test-cases-observability.json',
  'test-cases-edge.json',
  'test-cases-engines.json',
];

let testCases: any[] = [];
for (const f of caseFiles) {
  const content = await fs.readFile(path.join(__dirname, f), 'utf-8');
  testCases = testCases.concat(JSON.parse(content));
}

async function jsonReq(base: string, method: string, route: string, headers: Record<string, string>, body?: any) {
  const hdrs: Record<string, string> = { ...headers };
  const init: RequestInit = { method, headers: hdrs };
  if (body) {
    init.body = JSON.stringify(body);
    hdrs['content-type'] = 'application/json';
  }
  const response = await fetch(`${base}${route}`, init);
  let resBody;
  try {
    resBody = await response.json();
  } catch {
    resBody = await response.text();
  }
  return { status: response.status, body: resBody };
}

test(`API Data-Driven Test Suite (${testCases.length} Cases)`, async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-api-ddt-'));
  const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json') });
  auth.createUser({ username: 'admin-ddt', password: 'password', roles: ['ADMIN', 'COMMAND', 'READ_AUDIT'] });

  // This lane must be hermetic. PostgreSQL is covered by the explicit
  // integration/smoke lane, not by the default data-driven regression suite.
  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;

  let authToken = '';

  try {
    for (const tc of testCases) {
      await t.test(`[${tc.id}] ${tc.name} (${tc.method} ${tc.route})`, async () => {
        const headers: Record<string, string> = { ...tc.headers };
        if (tc.requiresAuth && authToken) {
          headers['authorization'] = `Bearer ${authToken}`;
        }

        const res = await jsonReq(base, tc.method, tc.route, headers, tc.body);

        // Special hook: if this is the valid login test, capture the token for subsequent requests
        if (tc.name === 'Auth - Valid Login' && res.status === 200) {
          authToken = res.body.token;
        }

        assert.equal(res.status, tc.expectedStatus, `Expected status ${tc.expectedStatus} but got ${res.status}. Body: ${JSON.stringify(res.body)}`);

        if (tc.expectedBodySubset) {
          for (const [key, val] of Object.entries(tc.expectedBodySubset)) {
            assert.equal(res.body[key], val);
          }
        }
      });
    }
  } finally {
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
