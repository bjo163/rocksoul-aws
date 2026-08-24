import assert from 'node:assert/strict';
import test from 'node:test';

import * as kernel from '../packages/kernel/src/index.ts';
import * as revelation from '../packages/revelation/src/index.ts';

test('workspace package facades resolve', () => {
  assert.equal(typeof kernel.DOMAIN_TYPES, 'object');
  assert.equal(typeof kernel.ModelRegistry, 'function');
  assert.equal(typeof kernel.BOUNDARIES, 'object');
  assert.equal(typeof revelation.buildRevelationGraph, 'function');
  assert.equal(typeof revelation.normalizeEvidenceProvenance, 'function');
  assert.equal(typeof revelation.buildUniverseProjection, 'function');
});

test('prophet model is a Revelation-first relational type', () => {
  const prophetType = kernel.DOMAIN_TYPES.find((item: { typeId: string }) => item.typeId === 'REVELATION.PROPHET_PROFILE');
  assert.ok(prophetType);
  assert.equal(prophetType!.entityFamily, 'ENTITY');
  assert.equal(prophetType!.domain, 'REVELATION');
});
