#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '../dist/apps/api/src/app.js';
import { createAuthService } from '../../../dist/src/access/auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const caseFiles = [
  'test-cases-auth.json',
  'test-cases-kernel.json',
  'test-cases-entities.json',
  'test-cases-commands.json',
  'test-cases-observability.json',
  'test-cases-edge.json',
  'test-cases-engines.json',
];

const from = Number(process.env.DDT_FROM ?? 1);
const to = Number(process.env.DDT_TO ?? 999);
if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
  throw new Error('DDT_FROM/DDT_TO must be positive integer bounds');
}

const cases = [];
for (const file of caseFiles) {
  const payload = JSON.parse(await fs.readFile(path.join(here, file), 'utf8'));
  cases.push(...payload);
}
const selected = cases.filter((item) => {
  const id = Number(String(item.id).replace('TC-', ''));
  return id >= from && id <= to;
});

const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mw-ddt-diagnose-'));
const auth = createAuthService({ storagePath: path.join(dataDir, 'auth-users.json') });
auth.createUser({ username: 'admin-ddt', password: 'password', roles: ['ADMIN', 'COMMAND', 'READ_AUDIT'] });
const app = await buildApp({ dataDir, persistenceDriver: 'file' });
await app.start(0, '127.0.0.1');
const address = app.server.address();
if (!address || typeof address !== 'object') throw new Error('SERVER_ADDRESS_UNAVAILABLE');
const base = `http://127.0.0.1:${address.port}`;
let token = '';
const failures = [];
const histogram = new Map();

async function request(item) {
  const headers = { ...(item.headers ?? {}) };
  if (item.requiresAuth && token) headers.authorization = `Bearer ${token}`;
  if (item.body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${base}${item.route}`, {
    method: item.method,
    headers,
    body: item.body === undefined ? undefined : JSON.stringify(item.body),
  });
  let body;
  try { body = await response.json(); } catch { body = await response.text(); }
  return { status: response.status, body };
}

try {
  for (const item of selected) {
    const result = await request(item);
    if (item.name === 'Auth - Valid Login' && result.status === 200) token = result.body?.token ?? '';
    if (result.status !== item.expectedStatus) {
      const key = `${item.route}::${item.expectedStatus}->${result.status}`;
      histogram.set(key, (histogram.get(key) ?? 0) + 1);
      failures.push({ id: item.id, name: item.name, route: item.route, expected: item.expectedStatus, actual: result.status, body: result.body });
    }
  }
} finally {
  await app.close();
  await fs.rm(dataDir, { recursive: true, force: true });
}

console.log(JSON.stringify({
  range: { from, to },
  selected: selected.length,
  failures: failures.length,
  clusters: [...histogram.entries()].map(([signature, count]) => ({ signature, count })),
  failureCases: failures,
}, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
