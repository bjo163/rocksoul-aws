import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProphetKnowledgeProfiles } from '../packages/revelation/src/knowledge-profile.js';

test('knowledge profile joins prophet, scripture references, and prophetic events without new persistence entities', () => {
  const profiles = [{
    id: 'ADAM',
    name: 'Adam',
    order: 1,
    sourceProfiles: ['QURAN'],
    aliases: ['ADAM'],
    quranReferences: ['Q2:30'],
    missionTags: ['HUMAN_ORIGIN'],
    heroReference: false,
    provenance: 'DATASET_CANONICAL' as const,
  }];
  const references = [{
    id: 'REF-1', sourceId: 'QURAN', bookId: 'BOOK-QURAN', reference: 'Q2:30', subjectId: 'ADAM',
    grounding: 'QURAN_EXPLICIT' as const, provenance: 'DATASET_CANONICAL' as const,
  }];
  const events = [{
    id: 'EVENT-1', title: 'Creation', prophetId: 'ADAM', quranReferences: ['Q2:30'],
    eventTags: ['ORIGIN'], evidenceClass: 'QURAN_EXPLICIT', grounding: 'QURAN_EXPLICIT' as const,
    provenance: 'DATASET_CANONICAL' as const,
  }];

  const [profile] = buildProphetKnowledgeProfiles(profiles, references, events);
  assert.equal(profile.personId, 'ADAM');
  assert.equal(profile.prophetReferenceId, 'PROPHET_REFERENCE::ADAM');
  assert.equal(profile.sourceClass, 'REVELATION');
  assert.equal(profile.epistemicLane, 'CORE');
  assert.deepEqual(profile.scriptureReferences.map((item) => item.reference), ['Q2:30']);
  assert.deepEqual(profile.propheticEvents.map((item) => item.id), ['EVENT-1']);
});

test('unresolved scripture/event data keeps the whole profile visibly unresolved', () => {
  const profiles = [{
    id: 'UNKNOWN', name: 'Unknown', order: 1, sourceProfiles: [], aliases: [], quranReferences: [],
    missionTags: [], heroReference: false, provenance: 'DATASET_CANONICAL' as const,
  }];
  const references = [{
    id: 'REF-U', sourceId: 'UNKNOWN', bookId: 'UNKNOWN', reference: 'X1:1', subjectId: 'UNKNOWN',
    grounding: 'UNRESOLVED' as const, provenance: 'DATASET_CANONICAL' as const,
  }];
  const events = [{
    id: 'EVENT-U', title: 'Unknown', prophetId: 'UNKNOWN', quranReferences: [], eventTags: [],
    evidenceClass: 'UNKNOWN', grounding: 'UNRESOLVED' as const, provenance: 'DATASET_CANONICAL' as const,
  }];

  const [profile] = buildProphetKnowledgeProfiles(profiles, references, events);
  assert.equal(profile.epistemicLane, 'UNRESOLVED');
});
