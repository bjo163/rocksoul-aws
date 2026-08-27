import assert from 'node:assert/strict';
import { temporalEvidenceByClass, temporalEvidenceRegistry } from '../src/revelation/temporal-evidence.js';

const registry = temporalEvidenceRegistry();
assert.equal(registry.protocol, 'QURAN_TEMPORAL_EVIDENCE_V1');
assert.equal(registry.status, 'FROZEN');
assert.equal(registry.corpus.book, 'QURAN');
assert.equal(registry.parser.id, 'TEMPORAL_EVIDENCE_PARSER_V1');
assert.equal(registry.parser.doesNotStoreVerseText, true);
assert.equal(registry.corpus.canonicalCorpusPath, 'data/divine-books/quran/ayahs.jsonl');

for (const evidenceClass of ['E1', 'E2', 'E3', 'E4', 'E5'] as const) {
  const items = temporalEvidenceByClass(evidenceClass);
  assert.ok(items.length > 0, `${evidenceClass} requires at least one frozen evidence item`);
  for (const item of items) {
    assert.match(item.reference, /^\d+:\d+$/);
    assert.equal(item.canonicalCorpusReference, `${registry.corpus.canonicalCorpusPath}#${item.reference}`);
    assert.equal(Object.hasOwn(item as object, 'text'), false, 'registry must not fabricate or store verse text');
  }
}

const hypotheses = temporalEvidenceByClass('E5');
assert.ok(hypotheses.every((item) => item.explicitRevelation === false));
assert.ok(hypotheses.every((item) => item.provenance.interpretationStatus === 'RESEARCH_HYPOTHESIS'));
assert.ok(hypotheses.every((item) => item.claimBoundary.includes('RESEARCH/HYPOTHESIS ONLY')));
assert.ok(registry.boundary.includes('must never be presented as explicit revelation'));

console.log(JSON.stringify({ ok: true, items: registry.items.length, classes: Object.keys(registry.classes) }, null, 2));
