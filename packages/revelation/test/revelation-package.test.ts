import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { corroborationSourceGuardPure, isAllowedNormativeBook, normativeSourceGuardPure } from '../src/source-policy.js';
import { normalizeProphetProfiles } from '../src/prophet-profile.js';
import { normalizeScriptureReferences } from '../src/scripture-reference.js';
import { normalizePropheticEvents } from '../src/prophetic-event.js';
import { buildRevelationGraph } from '../src/revelation-graph.js';
import { normalizeEvidenceProvenance } from '../src/evidence-provenance.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const path of ['packages/revelation/data/prophets.json','packages/revelation/data/knowledge/prophet-scripture-index.json','packages/revelation/data/knowledge/prophetic-events.json']) {
  await access(join(root, path.replace(/^packages[\\/]revelation[\\/]/, '')));
}

assert.equal(isAllowedNormativeBook('quran'), true);
assert.equal(isAllowedNormativeBook('hadith'), false);
assert.deepEqual(normativeSourceGuardPure({ book: 'QURAN', sourceClass: 'TEXTUAL_WITNESS', corpusReady: true }), { allowed: false, reason: 'SOURCE_CLASS_NOT_PRIMARY_NORMATIVE' });
assert.deepEqual(normativeSourceGuardPure({ book: 'QURAN', sourceClass: 'SCRIPTURE', corpusReady: false }), { allowed: false, reason: 'CORPUS_NOT_AVAILABLE_FOR_PRIMARY_NORMATIVE_USE' });
assert.deepEqual(corroborationSourceGuardPure({ book: 'INJIL', sourceClass: 'TEXTUAL_WITNESS', corpusReady: true }), { allowed: true, reason: 'TEXTUAL_WITNESS_CORROBORATION_ALLOWED_CONFIDENCE_ONLY' });

const evidence = normalizeEvidenceProvenance([
  { evidenceId: 'EV-QURAN-1', entityId: 'PASSAGE-1', sourceType: 'DOCUMENT', reference: 'Q2:30-39', status: 'VERIFIED', confidence: 1, payload: { evidenceClass: 'QURAN_EXPLICIT' } },
  { evidenceId: 'EV-WITNESS-1', entityId: 'PASSAGE-1', sourceType: 'TESTIMONY', reference: 'WIT-1', status: 'CORROBORATED', confidence: 0.7 },
  { evidenceId: 'EV-OBS-1', entityId: 'CASE-1', sourceType: 'SYSTEM_RECORD', reference: 'REC-1', status: 'OBSERVED', confidence: 0.9 },
  { evidenceId: 'EV-DERIVED-1', entityId: 'CASE-1', sourceType: 'AI_ANALYSIS', status: 'INFERRED', confidence: 1 },
  { evidenceId: 'EV-CONFLICT-1', entityId: 'CASE-1', sourceType: 'USER_SUBMITTED', status: 'CONFLICTED', supersededBy: 'EV-OBS-1' },
]);
assert.equal(evidence[0].class, 'QURAN_EXPLICIT');
assert.equal(evidence[0].grounding, 'EXPLICIT');
assert.equal(evidence[0].normativeAuthority, true);
assert.equal(evidence[1].class, 'TEXTUAL_WITNESS_CORROBORATION');
assert.equal(evidence[1].grounding, 'CORROBORATIVE');
assert.equal(evidence[2].grounding, 'OBSERVED');
assert.equal(evidence[3].grounding, 'DERIVED');
assert.equal(evidence[4].grounding, 'CONFLICTED');
assert.equal(evidence[4].superseded, true);
assert.ok(evidence.every((item) => item.originalRevelationEquated === false));

const profiles = normalizeProphetProfiles([
  { id: 'ADAM', name: 'Adam', order: 1, sourceProfiles: ['QURAN'], metadata: { aliases: ['Adam'], quranReferences: ['Q2:30-39'], missionTags: ['ORIGIN'], heroReference: true } },
  { id: 'MUHAMMAD', name: 'Muhammad', order: 25, sourceProfiles: ['QURAN'], metadata: { aliases: ['Muhammad'], quranReferences: ['Q33:40'], missionTags: ['MESSENGER'], heroReference: true } },
]);
assert.deepEqual(profiles.map((item) => item.id), ['ADAM', 'MUHAMMAD']);

const scripture = normalizeScriptureReferences([
  { id: 'QREF-ADAM-Q2_30_39', data: { sourceId: 'BOOK-QURAN', reference: 'Q2:30-39', prophetId: 'ADAM', relationType: 'REFERENCES_PROPHET' } },
  { id: 'QREF-MUHAMMAD-Q33_40', data: { sourceId: 'BOOK-QURAN', reference: 'Q33:40', prophetId: 'MUHAMMAD', relationType: 'REFERENCES_PROPHET' } },
]);
assert.equal(scripture.length, 2);
assert.equal(scripture[0].grounding, 'QURAN_EXPLICIT');
assert.equal(scripture[0].passageStart, 30);
assert.equal(scripture[0].passageEnd, 39);

const events = normalizePropheticEvents([
  { id: 'EVENT-ADAM-CREATION', data: { title: 'Creation', prophetId: 'ADAM', quranReferences: ['Q2:30-39'], eventTags: ['ORIGIN'], evidenceClass: 'QURAN_EXPLICIT' } },
  { id: 'EVENT-MUHAMMAD-REVELATION', data: { title: 'Revelation', prophetId: 'MUHAMMAD', quranReferences: ['Q96:1-5'], eventTags: ['REVELATION'], evidenceClass: 'QURAN_EXPLICIT' } },
]);
assert.equal(events.every((item) => item.grounding === 'QURAN_EXPLICIT'), true);

const graph = buildRevelationGraph({ prophets: profiles, scriptureReferences: scripture, events });
assert.equal(graph.protocol, 'REVELATION_GRAPH_V1');
assert.ok(graph.nodes.some((node) => node.id === 'BOOK-QURAN' && node.kind === 'BOOK' && node.lane === 'CORE'));
assert.ok(graph.nodes.some((node) => node.id === 'QURAN:SURAH:2' && node.kind === 'SURAH'));
assert.ok(graph.nodes.some((node) => node.id === 'QURAN:2:30-39' && node.kind === 'PASSAGE'));
assert.ok(graph.nodes.some((node) => node.id === 'ADAM' && node.kind === 'PROPHET_REFERENCE'));
assert.ok(graph.nodes.some((node) => node.id === 'EVENT-MUHAMMAD-REVELATION' && node.kind === 'PROPHETIC_EVENT'));
assert.ok(graph.relations.some((relation) => relation.relation === 'PASSAGE_REFERENCES_PROPHET'));
assert.ok(graph.relations.some((relation) => relation.relation === 'PROPHET_HAS_EVENT'));
assert.ok(graph.relations.some((relation) => relation.relation === 'EVENT_ATTESTED_BY_PASSAGE'));
assert.equal(graph.boundaries.prophetBecomesDivineOntology, false);
assert.equal(graph.boundaries.unresolvedPromotedToCore, false);
assert.equal(graph.boundaries.inferredChronology, false);
assert.equal(graph.boundaries.nonScripturalEvidencePromoted, false);

const unresolvedGraph = buildRevelationGraph({ prophets: [{ id: 'UNKNOWN', quranReferences: [] }], scriptureReferences: [], events: [{ id: 'EVENT-UNKNOWN', prophetId: 'UNKNOWN', quranReferences: [], grounding: 'UNRESOLVED' }] });
assert.equal(unresolvedGraph.nodes.find((node) => node.id === 'EVENT-UNKNOWN')?.lane, 'UNRESOLVED');
assert.equal(unresolvedGraph.relations.find((relation) => relation.toId === 'EVENT-UNKNOWN')?.lane, 'UNRESOLVED');
