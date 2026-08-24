import assert from 'node:assert/strict';
import test from 'node:test';
import { enforceEpistemicBoundary, resolveProfileLane } from '../packages/revelation/src/epistemic-boundary.js';
import { buildProphetKnowledgeProfiles } from '../packages/revelation/src/knowledge-profile.js';

test('CORE is only allowed for canonical revelation or scriptural metadata source classes', () => {
  assert.equal(enforceEpistemicBoundary('CORE', 'REVELATION'), 'CORE');
  assert.equal(enforceEpistemicBoundary('CORE', 'SCRIPTURAL_METADATA'), 'CORE');
  assert.equal(enforceEpistemicBoundary('CORE', 'AI_OUTPUT'), 'DERIVED');
  assert.equal(enforceEpistemicBoundary('CORE', 'OBSERVATION'), 'DERIVED');
  assert.equal(enforceEpistemicBoundary('CORE', 'INFERENCE'), 'DERIVED');
});

test('profile lane resolution distinguishes explicit, derived and unresolved context', () => {
  assert.equal(resolveProfileLane({ hasExplicitGrounding: true }), 'CORE');
  assert.equal(resolveProfileLane({ hasExplicitGrounding: false, hasDerivedContext: true }), 'DERIVED');
  assert.equal(resolveProfileLane({ hasExplicitGrounding: false }), 'UNRESOLVED');
  assert.equal(resolveProfileLane({ hasExplicitGrounding: true, hasUnresolvedContext: true }), 'UNRESOLVED');
});

test('knowledge profiles cannot silently become CORE without grounding', () => {
  const [profile] = buildProphetKnowledgeProfiles([
    {
      id: 'UNKNOWN', name: 'Unknown', order: 1, sourceProfiles: [], aliases: [], quranReferences: [],
      missionTags: [], heroReference: false, provenance: 'DATASET_CANONICAL',
    },
  ], [], []);

  assert.equal(profile.epistemicLane, 'UNRESOLVED');
});

test('knowledge profiles with explicit quran grounding remain CORE', () => {
  const [profile] = buildProphetKnowledgeProfiles([
    {
      id: 'ADAM', name: 'Adam', order: 1, sourceProfiles: ['QURAN'], aliases: [], quranReferences: ['Q2:30'],
      missionTags: [], heroReference: false, provenance: 'DATASET_CANONICAL',
    },
  ], [], []);

  assert.equal(profile.epistemicLane, 'CORE');
  assert.equal(profile.sourceClass, 'REVELATION');
});
