import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('SDK package remains independently importable and versioned', () => {
  const pkg = path.resolve('packages/sdk/package.json');
  assert.ok(fs.existsSync(pkg), 'packages/sdk/package.json must exist');
  const manifest = JSON.parse(fs.readFileSync(pkg, 'utf8')) as { name?: string; version?: string; exports?: unknown };
  assert.equal(manifest.name, '@moonwitness/sdk');
  assert.match(String(manifest.version ?? ''), /^4\./);
});

test('SDK exposes a stable entrypoint', () => {
  assert.ok(fs.existsSync(path.resolve('packages/sdk/src/index.ts')));
});

test('every SDK HTTP operation is declared by the canonical OpenAPI contract', () => {
  const openapi = JSON.parse(fs.readFileSync(path.resolve('docs/api/openapi.json'), 'utf8')) as { paths?: Record<string, unknown> };
  const documented = new Set(Object.keys(openapi.paths ?? {}));
  const sdkRoutes = [
    '/api/v1/health',
    '/api/v1/ready',
    '/api/v1/features',
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/logout',
    '/api/v1/auth/me',
    '/api/v1/xrp/workspace',
    '/api/v1/observe',
    '/api/v1/analyze',
    '/api/v1/evaluate',
    '/api/v1/query',
    '/api/v1/command',
    '/api/v1/resource/{id}',
    '/api/v1/resource/{id}/evidence',
    '/api/v1/reviews',
    '/api/v1/reviews/{id}/transition',
  ];
  for (const route of sdkRoutes) {
    assert.ok(documented.has(route), `OpenAPI is missing SDK route ${route}`);
  }
});
