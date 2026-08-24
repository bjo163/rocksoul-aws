import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const openapiPath = path.join(root, 'docs', 'api', 'openapi.json');

test('canonical API OpenAPI document is valid JSON and has required v1 health/auth/AI paths', () => {
  const raw = fs.readFileSync(openapiPath, 'utf8');
  const document = JSON.parse(raw) as Record<string, any>;
  assert.equal(document.openapi, '3.1.0');
  assert.equal(document.info?.version, '4.33.0');
  for (const route of [
    '/api/v1/health',
    '/api/v1/ready',
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/logout',
    '/api/v1/auth/me',
    '/api/v1/features',
    '/api/v1/ai/analyze',
  ]) {
    assert.ok(document.paths?.[route], `OpenAPI missing ${route}`);
  }
  assert.deepEqual(document.components?.schemas?.ApiError?.required, ['error']);
  assert.equal(document.components?.securitySchemes?.bearerAuth?.scheme, 'bearer');
});
