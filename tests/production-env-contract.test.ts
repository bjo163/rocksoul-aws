import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('production environment template is fail-closed and contains no real secrets', () => {
  const text = fs.readFileSync(path.join(root, '.env.production.example'), 'utf8');
  for (const key of ['STORAGE_DRIVER', 'PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'JWT_SECRET', 'MOONWITNESS_ADMIN_RID', 'MW_CORS_ORIGINS', 'MW_COOKIE_SECURE', 'MW_TRUST_PROXY', 'WITNESS_KEY_PASSWORD']) {
    assert.match(text, new RegExp(`^${key}=`, 'm'), `missing ${key}`);
  }
  assert.match(text, /^STORAGE_DRIVER=postgres$/m);
  assert.match(text, /^NODE_ENV=production$/m);
  assert.match(text, /^MW_COOKIE_SECURE=1$/m);
  assert.match(text, /^MW_TRUST_PROXY=1$/m);
  assert.match(text, /REPLACE_IN_SECRET_STORE/);
});
