import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mineAsmaCandidates } from '../src/revelation/asma/candidate-miner.js';
import { mineExplicitDivineRelations } from '../src/revelation/asma/relation-miner.js';
import { asmaEngineSnapshot, selectAsmaReminderCandidates } from '../src/revelation/asma/asma-engine.js';
import { revelationMoralGraph } from '../src/revelation/moral-graph/revelation-moral-graph.js';
import { revelationSemanticCoreSnapshot } from '../src/revelation/revelation-semantic-core.js';

assert.equal(fs.existsSync('src/engines/asma.ts'),false);
assert.equal(fs.existsSync('data/asmaul-husna.json'),false);
assert.equal(fs.existsSync('data/asma-semantic-profiles.json'),false);

const candidates=mineAsmaCandidates();
assert.ok(candidates.length>100);
assert.ok(candidates.every(x=>x.references.length>0 && x.references.every(r=>r.startsWith('Q'))));
assert.ok(candidates.some(x=>x.phrase.includes('غفور') || x.phrase.includes('الغفور')));
assert.ok(candidates.every(x=>!('id' in (x as any))));

const relations=mineExplicitDivineRelations();
const has=(relation:string,reference:string)=>relations.some(x=>x.relation===relation && x.reference===reference);
assert.equal(has('LOVES','Q2:195'),true);
assert.equal(has('DOES_NOT_LOVE','Q2:190'),true);
assert.equal(has('COMMANDS','Q16:90'),true);
assert.equal(has('FORBIDS','Q16:90'),true);
assert.equal(has('FORGIVES','Q39:53'),true);
assert.equal(has('KNOWS','Q2:77'),true);

const snapshot=asmaEngineSnapshot(process.cwd(),{maxCandidates:25,maxFields:8});
assert.equal(snapshot.protocol,'PURE_REVELATION_ASMA_V2');
assert.equal(snapshot.invariants.canonical99Hardcoded,false);
assert.equal(snapshot.invariants.humanCuratedNameListUsed,false);
assert.equal(snapshot.invariants.externalLexiconUsed,false);
assert.equal(snapshot.activeCorpora.includes('QURAN'),true);
assert.deepEqual(snapshot.unavailableCorpora,[]);
assert.deepEqual(snapshot.referenceIndexCorpora,[]);
assert.deepEqual(snapshot.corroborativeTextCorpora,['TAWRAT','ZABUR','INJIL']);
assert.deepEqual(snapshot.pendingFullTextCorpora,[]);
assert.ok(snapshot.semanticFields.every(x=>x.method==='CORPUS_COOCCURRENCE_ONLY'));
assert.equal(snapshot.divineOntology.protocol,'PURE_REVELATION_DIVINE_ONTOLOGY_V1');
assert.equal(snapshot.divineOntology.invariants.canonicalDivineNamePromotedAutomatically,false);

const reminder=selectAsmaReminderCandidates(1234,2);
assert.equal(reminder.length,2);
assert.notEqual(reminder[0].candidateId,reminder[1].candidateId);
assert.ok(reminder.every(x=>x.status==='CORROBORATED_SURFACE_CANDIDATE'));

const graph=revelationMoralGraph();
assert.equal(graph.invariants.actionSpecificMoralScoreHardcoded,false);
assert.equal(graph.invariants.perspectiveAssignmentIsEngineeringInterpretation,true);
assert.ok(graph.edges.some(x=>x.perspective==='GREEN'));
assert.ok(graph.edges.some(x=>x.perspective==='RED'));
assert.ok(graph.edges.some(x=>x.perspective==='LIGHT'));
assert.ok(graph.edges.some(x=>x.perspective==='BLUE'));

const core=revelationSemanticCoreSnapshot();
assert.equal(core.version,'4.32.0');
assert.equal(core.boundaries.canonical99IsSourceOfTruth,false);
assert.equal(core.boundaries.asmaMustBeDiscoveredFromRevelation,true);
assert.equal(core.asma.protocol,'PURE_REVELATION_ASMA_V2');
assert.equal(core.moralGraph.protocol,'REVELATION_MORAL_GRAPH_V2');

console.log(JSON.stringify({ok:true,candidates:candidates.length,relations:relations.length,graphEdges:graph.edges.length,semanticFields:snapshot.semanticFields.length},null,2));
