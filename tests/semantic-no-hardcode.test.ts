import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import JSON5 from 'node:module';
import path from 'node:path';

function read(relative: string): string {
  return fs.readFileSync(path.resolve(relative), 'utf8');
}

function readJson(relative: string): any {
  return JSON.parse(read(relative));
}

const profile = readJson('data/events/event-language-profile.json');
const semanticSource = read('src/ai/semantic-engine.ts');
const eventSource = read('src/events/event-parser.ts');

const lexicalBuckets = [
  profile.context?.mistake,
  profile.context?.coercion,
  profile.context?.permission,
  profile.context?.emergency,
  profile.context?.negation,
  profile.reporting?.verbs,
  profile.reporting?.unverified,
  profile.ownership?.other,
  profile.ownership?.self,
  profile.ownership?.return,
  profile.genericActionSurfaces?.PROPERTY_TAKING,
  profile.genericActionSurfaces?.RETURN,
  profile.semanticVocabulary?.scriptureSourceTerms,
  profile.semanticVocabulary?.verificationSignals,
  profile.semanticVocabulary?.causalSignals,
  profile.semanticVocabulary?.subjectPronouns,
  profile.semanticVocabulary?.passiveSuppressionSignals,
  profile.semanticVocabulary?.reportedActiveVerbs,
  profile.semanticVocabulary?.objectVerbs,
  profile.semanticVocabulary?.ownerMarkers,
  profile.semanticVocabulary?.rightfulOwnerPhrases,
  profile.semanticVocabulary?.intentionSignals,
  profile.semanticVocabulary?.extractionStopWords,
  profile.semanticVocabulary?.explicitTakingTerms,
].flat().filter((value): value is string => typeof value === 'string');

test('semantic engines do not embed runtime lexical vocabulary', () => {
  for (const term of lexicalBuckets) {
    const normalized = term.toLowerCase();
    assert.equal(semanticSource.toLowerCase().includes(normalized), false, `semantic-engine.ts hardcodes lexical term: ${term}`);
    assert.equal(eventSource.toLowerCase().includes(normalized), false, `event-parser.ts hardcodes lexical term: ${term}`);
  }
});

test('semantic policy action ids are loaded through runtime profile', () => {
  const actionIds = [
    ...Object.values(profile.semanticPolicy?.composition?.negativeActionsWhenRestitution ?? {}),
    ...Object.values(profile.semanticPolicy?.summaryActionGroups ?? {}).flatMap((group: unknown) => Array.isArray(group) ? group : []),
    ...Object.values(profile.semanticPolicy?.structuralActions ?? {}),
  ].filter((value): value is string => typeof value === 'string');
  for (const action of actionIds) {
    assert.equal(eventSource.includes(`'${action}'`), false, `event-parser.ts hardcodes policy action: ${action}`);
    assert.equal(semanticSource.includes(`'${action}'`), false, `semantic-engine.ts hardcodes policy action: ${action}`);
  }
});
