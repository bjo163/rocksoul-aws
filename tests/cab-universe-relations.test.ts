import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registry = fs.readFileSync(path.join(root, 'src/backend/model-registry.ts'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(root, 'apps/cab/src/data/ui-config.json'), 'utf8'));

test('model registry exposes only canonical v1 API boundaries', () => {
  assert.match(registry, /\/api\/v1\/query\?type=/);
  assert.match(registry, /\/api\/v1\/resource\/:id/);
  assert.doesNotMatch(registry, /\/api\/entities/);
});

test('prophet reference is relationally grounded across revelation, world, and knowledge', () => {
  const text = registry;
  assert.match(text, /'HERO_REFERENCE\.PROPHET':/);
  assert.match(text, /primaryDomain: 'REVELATION'/);
  assert.match(text, /'SCRIPTURE_REFERENCE'/);
  assert.match(text, /'PROPHETIC_EVENT'/);
  assert.match(text, /relationLayers: \['REVELATION', 'WORLD', 'KNOWLEDGE'\]/);
  assert.match(text, /historical reconstruction/);
  assert.match(text, /unsupported chronology/);
});

test('CAB taxonomy keeps prophet references in the revelation bridge lane', () => {
  assert.deepEqual(config.universeFamilies.REVELATION.includes('PROPHET_REFERENCE'), true);
  assert.deepEqual(config.universeFamilies.WORLD.includes('PROPHET'), false);
  assert.deepEqual(config.epistemicLanes.UNRESOLVED, ['UNKNOWN', 'CONFLICTED']);
});
