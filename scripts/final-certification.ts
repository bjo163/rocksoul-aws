import assert from 'node:assert/strict';
import { loadSeedManifest, seedDatabase } from '../packages/persistence/src/bootstrap.js';
import { createPersistence } from '../packages/persistence/src/factory.js';
import { buildAiAnalysis } from '../src/ai/general-analyzer.js';
import { verifyRevelationCorpusFiles } from '../src/revelation/corpus/revelation-seed.js';
import { runRevelationTenCaseSmoke } from '../src/revelation/verification/ten-case.js';
import { runMoralLifecycleSmoke } from '../src/events/verification/lifecycle-smoke.js';
import { revelationGrammarSnapshot } from '../src/revelation/grammar/revelation-grammar.js';
import { divineOntologySnapshot } from '../src/revelation/asma/divine-ontology.js';

const semantic = (label: string, R: number, G: number, B: number, L: number, domain: Record<string, number>) => ({
  action: 'SEMANTIC_ACTION', mode: 'DEVIATION', confidence: 0.9,
  intention: { label, confidence: 0.9, rgbl: { R, G, B, L }, chain: [] },
  actionGateVector: Array(9).fill(0.3),
  impactVector: Array(13).fill(0.4),
  domainVector: domain,
  timeFactor: { timestamp: new Date().toISOString(), sequence: 1, phase: 'OBSERVED' },
  causality: { causal_strength: 0.6, confidence: 0.85 },
  evidence: [{ type: 'SEMANTIC_PROVIDER', reference: 'CERTIFICATION' }],
  caseId: `CERT-${label}`,
});

async function main(): Promise<void> {
  console.log('[cert] corpus');
  const revelationCorpus=verifyRevelationCorpusFiles(process.cwd());
  assert.equal(revelationCorpus.ok,true);
  console.log('[cert] revelation-grammar');
  const grammar=revelationGrammarSnapshot(process.cwd(),{sampleLimit:10});
  assert.equal(grammar.invariants.normativeAuthority,false);
  assert.equal(grammar.invariants.canonicalRootClaimed,false);
  assert.ok(grammar.frameCount>1000);
  assert.ok((grammar.countsByKind.PROHIBITION??0)>50);
  console.log('[cert] divine-ontology');
  const ontology=divineOntologySnapshot(process.cwd());
  assert.equal(ontology.invariants.canonical99Hardcoded,false);
  assert.equal(ontology.invariants.canonicalDivineNamePromotedAutomatically,false);
  assert.ok(ontology.counts.concepts>100);
  assert.ok(ontology.counts.explicitRelations>100);
  assert.ok(ontology.relationFamilies.some(x=>x.family==='LOVE'&&x.polarityContrastObserved));
  console.log('[cert] revelation-smoke');
  const revelationSmoke=await runRevelationTenCaseSmoke(process.cwd());
  assert.equal(revelationSmoke.ok,true);
  console.log('[cert] lifecycle-smoke');
  const moralLifecycle=await runMoralLifecycleSmoke(process.cwd());
  assert.equal(moralLifecycle.ok,true);
  assert.equal(moralLifecycle.summary.passed,10);
  console.log('[cert] seed-memory');
  const manifest = await loadSeedManifest(process.cwd());
  const seed = await seedDatabase(process.cwd(), { driver: 'memory' });
  assert.ok(seed.sources >= manifest.sources.length);
  assert.ok(seed.sources >= 12);
  assert.ok(seed.seeded >= revelationCorpus.totalExpected);

  console.log('[cert] event-chain');
  const store = createPersistence({ driver: 'memory' });
  const entities = store.entityRepository();
  await entities.put({ id: 'CERT-PERSON', type: 'PERSON', version: 1, payload: { name: 'Certification' } });
  const events = store.eventStore();
  const first = await events.append({ eventId: 'CERT-E1', entityId: 'CERT-PERSON', eventType: 'OBSERVATION', payload: { ok: true } });
  const second = await events.append({ eventId: 'CERT-E2', entityId: 'CERT-PERSON', eventType: 'ACTION', payload: { ok: true } });
  assert.equal(second.previousHash, first.eventHash);
  assert.equal((await events.verifyChain()).valid, true);
  await store.close();

  const cases = [
    ['CASE_A', -0.15, 0, 0.2, 0, { HEALTH: 0.82 }],
    ['CASE_B', -0.62, 0, 0.9, 0, { JUSTICE: 0.86 }],
    ['CASE_C', -0.9, 0, 0.95, 0, { JUSTICE: 0.94, GOVERNANCE: 0.78 }],
  ] as const;
  console.log('[cert] synthetic-cases');
  const outputs = cases.map(([label, R, G, B, L, domain]) => buildAiAnalysis(label, { semanticObservation: semantic(label, R, G, B, L, domain) }));
  assert.ok(outputs.every((r) => r.mizan?.actionGateVector.length === 9));
  assert.ok(outputs.every((r) => r.mizan?.impactVector.length === 13));
  assert.ok(outputs.every((r) => r.lifecycle?.final?.state === 'FINAL_STATE'));
  assert.equal(new Set(outputs.map((r) => r.mizan.assessment.accountabilityScore)).size, 3);

  console.log(JSON.stringify({ ok: true, seed, revelation:{corpus:{total:revelationCorpus.totalActual,fingerprint:revelationCorpus.fingerprint},grammar:{frameCount:grammar.frameCount,countsByKind:grammar.countsByKind},ontology:{counts:ontology.counts,relationFamilies:ontology.relationFamilies.length},smoke:revelationSmoke.summary,moralLifecycle:moralLifecycle.summary,adversarialSuites:'CERTIFIED_SEPARATELY_BY_NPM_RUN_TEST_EVENT'}, cases: outputs.map((r) => ({ caseId: r.caseId, score: r.mizan.assessment.accountabilityScore, band: r.mizan.assessment.band })) }, null, 2));
}

await main();
