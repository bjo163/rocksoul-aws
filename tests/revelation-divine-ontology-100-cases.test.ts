import assert from 'node:assert/strict';
import { divineOntologySnapshot } from '../src/revelation/asma/divine-ontology.js';
import { quranAyah } from '../src/revelation/quran-corpus.js';

const ontology=divineOntologySnapshot();
const concepts=ontology.concepts.filter(x=>x.references.length>0).slice(0,100);
assert.equal(concepts.length,100);
let passed=0;
for(const concept of concepts){
  assert.equal(concept.canonicalDivineNameClaimed,false);
  assert.ok(concept.surface.length>0);
  assert.ok(concept.candidateIds.length>0);
  assert.ok(concept.references.every(ref=>Boolean(quranAyah(ref.replace(/^Q/,'')))));
  assert.ok(concept.contextTokens.every(x=>x.token.length>0&&x.count>0));
  if(concept.clusterId){
    const cluster=ontology.clusters.find(x=>x.clusterId===concept.clusterId);
    assert.ok(cluster);
    assert.equal(cluster!.normativeAuthority,false);
    assert.ok(cluster!.conceptIds.includes(concept.conceptId));
  }
  passed++;
}
assert.equal(passed,100);
console.log(JSON.stringify({ok:true,cases:passed,clusters:ontology.counts.clusters,explicitRelations:ontology.counts.explicitRelations},null,2));
