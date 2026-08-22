import assert from 'node:assert/strict';
import { divineOntologySnapshot } from '../src/revelation/asma/divine-ontology.js';
import { revelationMoralGraph } from '../src/revelation/moral-graph/revelation-moral-graph.js';
import { quranAyah } from '../src/revelation/quran-corpus.js';

const ontology=divineOntologySnapshot();
assert.equal(ontology.protocol,'PURE_REVELATION_DIVINE_ONTOLOGY_V1');
assert.equal(ontology.version,'4.30.0');
assert.equal(ontology.invariants.canonical99Hardcoded,false);
assert.equal(ontology.invariants.humanCuratedNameListUsed,false);
assert.equal(ontology.invariants.externalLexiconUsed,false);
assert.equal(ontology.invariants.canonicalDivineNamePromotedAutomatically,false);
assert.equal(ontology.invariants.clusterSimilarityIsNormativeEvidence,false);
assert.ok(ontology.counts.concepts>100);
assert.ok(ontology.counts.explicitRelations>100);
assert.ok(ontology.relationFamilies.length>=6);
assert.ok(ontology.concepts.every(x=>x.references.length>0 && x.canonicalDivineNameClaimed===false));
assert.ok(ontology.clusters.every(x=>x.normativeAuthority===false && x.canonicalDivineNameClaimed===false));
for(const concept of ontology.concepts.slice(0,100)) for(const ref of concept.references.slice(0,5)) assert.ok(quranAyah(ref.replace(/^Q/,'')),`missing provenance ${ref}`);

const family=(name:string)=>ontology.relationFamilies.find(x=>x.family===name);
assert.ok(family('LOVE'));
assert.equal(family('LOVE')!.polarityContrastObserved,true);
assert.ok(family('LOVE')!.positiveRelations.includes('LOVES'));
assert.ok(family('LOVE')!.negativeRelations.includes('DOES_NOT_LOVE'));
assert.equal(family('FORGIVENESS')!.polarityContrastObserved,true);
assert.equal(family('GUIDANCE')!.polarityContrastObserved,true);
assert.ok(family('KNOWLEDGE')!.otherRelations.includes('KNOWS'));

const graph=revelationMoralGraph();
assert.equal(graph.protocol,'REVELATION_MORAL_GRAPH_V2');
assert.equal(graph.ontologyProtocol,'PURE_REVELATION_DIVINE_ONTOLOGY_V1');
assert.ok(graph.edges.every(x=>x.relationFamilyId));
assert.equal(graph.invariants.ontologyClusterMayCreateMoralAuthority,false);
assert.equal(graph.invariants.ontologyFamilyMayOverrideExplicitRelation,false);

console.log(JSON.stringify({ok:true,counts:ontology.counts,clusters:ontology.clusters.length,relationFamilies:ontology.relationFamilies.map(x=>({family:x.family,refs:x.references.length,contrast:x.polarityContrastObserved}))},null,2));
