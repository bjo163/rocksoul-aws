import assert from 'node:assert/strict';
import { scriptureSourcePolicy, normativeSourceGuard, scriptureCorpusStatus } from '../src/revelation/scripture-source-policy.js';
import { loadQuranCorpus, quranAyah } from '../src/revelation/quran-corpus.js';
import { scanQuranPlaceMentions, revelationGeographyReport } from '../src/revelation/revelation-geography.js';
import { mineAsmaCandidates } from '../src/revelation/asma/candidate-miner.js';
import { revelationResearchObjects, revelationSemanticCoreSnapshot } from '../src/revelation/revelation-semantic-core.js';

const policy=scriptureSourcePolicy();
assert.equal(policy.mode,'FOUR_BOOKS_ONLY');
assert.deepEqual(policy.normativeSources.map((x:any)=>x.canonicalName),['QURAN','TAWRAT','ZABUR','INJIL']);
assert.equal(normativeSourceGuard({book:'QURAN',sourceClass:'REVELATION'}).allowed,true);
assert.equal(normativeSourceGuard({book:'QURAN',sourceClass:'HADITH'}).allowed,false);
assert.equal(normativeSourceGuard({book:'TAWRAT',sourceClass:'REVELATION'}).allowed,false);
assert.equal(normativeSourceGuard({book:'TAWRAT',sourceClass:'TEXTUAL_WITNESS'}).allowed,false);
assert.equal(normativeSourceGuard({book:'NEWS',sourceClass:'WEB_RESEARCH'}).allowed,false);

const status=scriptureCorpusStatus();
assert.equal(status.books.QURAN.status,'AVAILABLE_CANONICAL_REFERENCE');
assert.equal(status.books.TAWRAT.status,'AVAILABLE_TEXTUAL_WITNESS_CORPUS');
assert.equal(status.books.ZABUR.status,'AVAILABLE_TEXTUAL_WITNESS_CORPUS');
assert.equal(status.books.INJIL.status,'AVAILABLE_TEXTUAL_WITNESS_CORPUS');
assert.equal(loadQuranCorpus().length,6236);
assert.equal(quranAyah('3:96')?.reference,'3:96');

const hits=scanQuranPlaceMentions();
assert.equal(hits.filter(x=>x.place==='MAKKAH').length,1);
assert.equal(hits.filter(x=>x.place==='BAKKAH').length,1);
assert.equal(hits.filter(x=>x.place==='UMM_AL_QURA').length,2);
assert.equal(hits.filter(x=>x.place==='AL_MADINAH').length,14);
assert.equal(hits.filter(x=>x.place==='AL_MADINAH' && x.role==='PROPHETIC_COMMUNITY_CITY_CONTEXT').length,4);

const geo=revelationGeographyReport();
assert.equal(geo.invariants.placeMentionIsRevelationPlace,false);
assert.equal(geo.invariants.bakkahEqualsMakkahNotAssumedFromTextAlone,true);
assert.equal(geo.invariants.externalMakkiMadaniClassificationUsed,false);


const research=revelationResearchObjects();
assert.equal(research.hypotheses.status,'RESEARCH_ONLY');
assert.equal(research.scriptureMap.status,'RESEARCH_ONLY_NOT_NORMATIVE_WEIGHT');
const core=revelationSemanticCoreSnapshot();
assert.equal(core.boundaries.researchHypothesisMayBecomeNormativeRuleAutomatically,false);
assert.equal(core.research.scriptureMap.quran.makkahFamily.length,4);

const attrs=mineAsmaCandidates();
assert.ok(attrs.length>100);
assert.ok(attrs.some(x=>x.references.length>0));
assert.equal(core.version,'4.30.0');
assert.equal(core.asma.protocol,'PURE_REVELATION_ASMA_V2');
assert.equal(core.divineOntology.protocol,'PURE_REVELATION_DIVINE_ONTOLOGY_V1');
assert.equal(core.boundaries.ontologyClusteringMayCreateNormativeAuthority,false);
console.log(JSON.stringify({ok:true,quranAyahs:6236,placeHits:hits.length,propheticMadinahContext:4,asmaSurfaceCandidates:attrs.length},null,2));
