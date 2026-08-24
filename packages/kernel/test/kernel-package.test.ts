import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN_TYPES, BOUNDARIES, RelationshipHub, ModelRegistry } from '../src/index.js';

test('kernel package exposes canonical domain and boundary primitives', () => {
  assert.ok(DOMAIN_TYPES.some((type) => type.typeId === 'REVELATION.PROPHET_PROFILE'));
  assert.equal(BOUNDARIES.literalDivineOperation, false);
  assert.equal(BOUNDARIES.destinationGuarantee, false);
  assert.ok(RelationshipHub);
  assert.ok(ModelRegistry);
});
