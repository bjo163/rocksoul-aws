import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('OpenAPI baseline declares the canonical API surface and deployment-ready servers', () => {
  const raw = fs.readFileSync('docs/api/openapi.json', 'utf8');
  const doc = JSON.parse(raw) as { openapi?: string; paths?: Record<string, unknown>; servers?: Array<{ url?: string }> };
  assert.match(String(doc.openapi), /^3\.1\./);
  for (const route of ['/api/v1/health', '/api/v1/ready', '/api/v1/command']) {
    assert.ok(doc.paths?.[route], `OpenAPI route missing: ${route}`);
  }
  assert.ok(Array.isArray(doc.servers) && doc.servers.length > 0, 'OpenAPI must declare a server target');
  assert.ok(doc.servers?.every((server) => typeof server.url === 'string' && !server.url.includes('localhost')), 'OpenAPI must not publish localhost as the canonical server');
});
