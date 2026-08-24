import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const configPath = new URL('../apps/cab/src/data/ui-config.json', import.meta.url);

test('CAB universe taxonomy uses canonical epistemic classes and RGBL roles', () => {
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
    rgblLabels?: Record<string, string>;
    epistemicLabels?: string[];
    universeFamilies?: Record<string, string[]>;
  };

  assert.equal(config.rgblLabels?.R, 'VIOLATION / HARM');
  assert.equal(config.rgblLabels?.G, 'CONSTRUCTIVE / BENEFIT');
  assert.equal(config.rgblLabels?.B, 'EPISTEMIC GROUNDING');
  assert.equal(config.rgblLabels?.L, 'RESTORATION / REPAIR');

  for (const status of ['QURAN_EXPLICIT', 'TEXTUAL_WITNESS', 'OBSERVED', 'VERIFIED', 'CORROBORATED', 'INFERRED', 'AI_INFERENCE', 'UNKNOWN', 'CONFLICTED']) {
    assert.ok(config.epistemicLabels?.includes(status), `missing ${status}`);
  }

  assert.deepEqual(config.universeFamilies?.WORLD, ['PERSON', 'PLACE', 'EVENT', 'STATE', 'CASE']);
  assert.deepEqual(config.universeFamilies?.REVELATION, ['BOOK', 'SURAH', 'PASSAGE', 'PROPHET_REFERENCE', 'DIVINE_RELATION', 'ASMA_CANDIDATE', 'ONTOLOGY_CONCEPT', 'MORAL_RELATION']);
});
