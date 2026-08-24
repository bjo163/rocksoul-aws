import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPeoplePlaceRelations } from '../packages/revelation/src/people-place-relations.js';

test('source-grounded people/place relations are deterministic and deduplicated', () => {
  const relations = buildPeoplePlaceRelations([
    {
      id: 'EVENT-2',
      kind: 'PROPHETIC_EVENT',
      placeReferences: ['PLACE-B', 'PLACE-B'],
      peopleReferences: ['PERSON-C', 'PERSON-A'],
      provenance: 'DATASET_CANONICAL',
    },
    {
      id: 'EVENT-1',
      kind: 'PROPHETIC_EVENT',
      placeReferences: [],
      peopleReferences: ['PERSON-Z'],
      provenance: 'DERIVED',
    },
  ]);

  assert.deepEqual(relations.map((relation) => relation.id), [
    'context:EVENT-1:involves:PERSON-Z',
    'context:EVENT-2:involves:PERSON-A',
    'context:EVENT-2:involves:PERSON-C',
    'context:EVENT-2:occurs-at:PLACE-B',
  ]);
  assert.equal(relations[0]?.epistemicLane, 'DERIVED');
  assert.equal(relations[0]?.sourceClass, 'INFERENCE');
  assert.equal(relations[3]?.epistemicLane, 'CORE');
  assert.equal(relations[3]?.sourceClass, 'REVELATION');
});

test('empty/unresolved references create no fabricated relations', () => {
  assert.deepEqual(buildPeoplePlaceRelations([
    { id: 'EVENT-EMPTY', kind: 'PROPHETIC_EVENT', placeReferences: [''], peopleReferences: [undefined as never], provenance: 'DATASET_CANONICAL' },
  ]), []);
});
