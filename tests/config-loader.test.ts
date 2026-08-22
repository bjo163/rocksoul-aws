// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOperationalYaml, loadDatabaseConfig } from '../src/config-loader.js';

test('minimal operational YAML parser supports repository config subset', () => {
  const v = parseOperationalYaml(`version: 1\nstorage:\n  driver: postgres\n  postgres: {}\nanalysis:\n  order: [R, G, B, L]\n  enabled: true\n`);
  assert.equal(v.version, 1);
  assert.equal(v.storage.driver, 'postgres');
  assert.deepEqual(v.storage.postgres, {});
  assert.deepEqual(v.analysis.order, ['R','G','B','L']);
  assert.equal(v.analysis.enabled, true);
});

test('database config loads without external YAML dependency', () => {
  const v = loadDatabaseConfig(process.cwd());
  assert.equal(v.version, 1);
  assert.equal(v.storage?.driver, 'postgres');
  assert.equal(v.seed?.mode, 'idempotent');
});
