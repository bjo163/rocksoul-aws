import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../src/app.js';
import { createAuthService } from '../../../src/access/auth.js';

process.env.NODE_ENV = 'test';
process.env.MW_RATE_LIMIT_PER_MINUTE = process.env.MW_DDT_RATE_LIMIT_PER_MINUTE ?? '100000';
process.env.MW_AUTH_RATE_LIMIT_PER_MINUTE = process.env.MW_DDT_AUTH_RATE_LIMIT_PER_MINUTE ?? '100000';
process.env.MW_AI_RATE_LIMIT_PER_MINUTE = process.env.MW_DDT_AI_RATE_LIMIT_PER_MINUTE ?? '100000';
process.env.MW_WRITE_RATE_LIMIT_PER_MINUTE = process.env.MW_DDT_RATE_LIMIT_PER_MINUTE ?? '100000';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

const requestedIds = new Set(
  String(process.env.DDT_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const hasFrom = process.env.DDT_FROM !== undefined && process.env.DDT_FROM !== '';
const hasTo = process.env.DDT_TO !== undefined && process.env.DDT_TO !== '';
const from = hasFrom ? Number.parseInt(process.env.DDT_FROM!, 10) : null;
const to = hasTo ? Number.parseInt(process.env.DDT_TO!, 10) : null;

if ((hasFrom && !Number.isInteger(from)) || (hasTo && !Number.isInteger(to))) {
  throw new Error('DDT_FROM_DDT_TO_MUST_BE_POSITIVE_INTEGERS');
}
if ((from !== null && from < 1) || (to !== null && to < 1)) {
  throw new Error('DDT_FROM_DDT_TO_MUST_BE_POSITIVE_INTEGERS');
}
if (from !== null && to !== null && from > to) {
  throw new Error('DDT_FROM_CANNOT_EXCEED_DDT_TO');
}

const filterEnabled = requestedIds.size > 0 || from !== null || to !== null;
if (filterEnabled) {
  testCases = testCases.filter((tc) => {
    const numericId = Number.parseInt(String(tc.id).replace(/^TC-/, ''), 10);
    const matchesId = requestedIds.size === 0 || requestedIds.has(String(tc.id));
    const matchesRange = (from === null || numericId >= from) && (to === null || numericId <= to);
    return matchesId && matchesRange;
  });
}

if (filterEnabled && testCases.length === 0) throw new Error('DDT_SELECTION_MATCHED_ZERO_CASES');

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

test(`API Data-Driven Test Suite (${testCases.length} Cases${filterEnabled ? ', filtered' : ''})`, async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-api-ddt-'));
  const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json') });
  auth.createUser({ username: 'admin-ddt', password: 'password', roles: ['ADMIN', 'COMMAND', 'READ_AUDIT'] });

  const app = await buildApp({ dataDir, persistenceDriver: 'file' });
  await app.start(0, '127.0.0.1');
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;

  let authToken = '';
  const failures: Array<{ id: string; name: string; expected: number; actual: number; body: unknown }> = [];

  try {
    for (const tc of testCases) {
      await t.test(`[${tc.id}] ${tc.name} (${tc.method} ${tc.route})`, async () => {
        const headers: Record<string, string> = { ...tc.headers };
        if (tc.requiresAuth && authToken) headers.authorization = `Bearer ${authToken}`;

        const res = await jsonReq(base, tc.method, tc.route, headers, tc.body);
        if (tc.name === 'Auth - Valid Login' && res.status === 200) authToken = res.body.token;

        if (res.status !== tc.expectedStatus) {
          failures.push({ id: tc.id, name: tc.name, expected: tc.expectedStatus, actual: res.status, body: res.body });
        }

        assert.equal(
          res.status,
          tc.expectedStatus,
          `Expected status ${tc.expectedStatus} but got ${res.status}. Body: ${JSON.stringify(res.body)}`,
        );

        if (tc.expectedBodySubset) {
          for (const [key, val] of Object.entries(tc.expectedBodySubset)) assert.equal(res.body[key], val);
        }
      });
    }
  } finally {
    if (failures.length > 0) {
      const statusClusters = failures.reduce<Record<string, number>>((acc, failure) => {
        const key = `${failure.expected}->${failure.actual}`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      console.error(JSON.stringify({ ddtSummary: { selected: testCases.length, failures: failures.length, statusClusters, cases: failures } }, null, 2));
    }
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
