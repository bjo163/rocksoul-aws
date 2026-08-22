import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN_TYPES } from '../../../src/backend/domain-types.js';

test('lifecycle model types are first-class and UI-discoverable', () => {
  for (const typeId of ['LIFECYCLE.MODE_PROFILE', 'LIFECYCLE.PUBLICATION', 'LIFECYCLE.PUBLICATION_GATE']) {
    assert.ok(DOMAIN_TYPES.some((x) => x.typeId === typeId), `missing ${typeId}`);
  }
});
