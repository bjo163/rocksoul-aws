import assert from 'node:assert/strict';
import { loadQuranNarrativePatterns, matchQuranNarratives } from '../src/ingress/quran-narrative-pattern-engine.js';
import { listQuranNarrativeStoryCandidates } from '../src/ingress/revelation-story-engine.js';
import { loadRevelationContextManifest, validateRevelationContextRecord } from '../src/ingress/revelation-context-engine.js';
import { loadRevelationPatternRegistry } from '../src/ingress/revelation-pattern-engine.js';

const patterns = await loadQuranNarrativePatterns();
assert.ok(patterns.length >= 15, 'narrative anchor registry should be populated');
assert.ok(patterns.some(p => p.id === 'STORY-YUSUF'));
assert.ok(patterns.some(p => p.references.includes('12:1-111')));

const yusuf = await matchQuranNarratives({ text: 'Yusuf prison dream reconciliation' });
assert.equal(yusuf[0]?.pattern.id, 'STORY-YUSUF');
const storyCandidates = await listQuranNarrativeStoryCandidates();
assert.ok(storyCandidates.length >= 15);
assert.ok(storyCandidates.some(row => row.id === 'STORY-MUSA')); 

const qadr = await loadRevelationPatternRegistry();
assert.ok(qadr.patterns.some((p: any) => p.id === 'RP-QADR-001'));
assert.equal(qadr.policy.distributionIntent, 'SIMULATION_ONLY');

const manifest = await loadRevelationContextManifest();
assert.equal(manifest.expected_shape.research_rows, 312);
assert.equal(manifest.sources.some(s => s.id === 'WAHIDI'), true);

assert.equal(validateRevelationContextRecord({
  ayah_refs: ['24:11-20'], source_ref: 'WAHIDI', report_status: 'REPORTED', confidence: 'SOURCE_DEPENDENT'
}).valid, true);
assert.equal(validateRevelationContextRecord({
  ayah_refs: [], source_ref: '', report_status: '', confidence: ''
}).valid, false);

console.log('PASS: revelation narrative/context patterns');
