import assert from 'node:assert/strict';
import { quranAyah } from '../src/revelation/quran-corpus.js';
import { analyzeQuranAyahGrammar, revelationGrammarSnapshot } from '../src/revelation/grammar/revelation-grammar.js';
import { mineExplicitDivineRelations } from '../src/revelation/asma/relation-miner.js';
import { assessQuranPassageDirections } from '../src/revelation/quran-passage-direction.js';

const root=process.cwd();
const a1690=quranAyah('16:90',root); assert.ok(a1690);
const g1690=analyzeQuranAyahGrammar(a1690!,root);
assert.equal(g1690.invariants.normativeAuthority,false);
assert.equal(g1690.invariants.canonicalRootClaimed,false);
assert.ok(g1690.frames.some(f=>f.kind==='DIVINE_PREDICATE' && String(f.predicateSurface).includes('يامر')));
assert.ok(g1690.frames.some(f=>f.kind==='COORDINATED_PREDICATE' && String(f.predicateSurface).includes('ينهى')));
assert.ok(g1690.frames.some(f=>f.kind==='PURPOSE_RESULT_CANDIDATE'));

const a2195=quranAyah('2:195',root); assert.ok(a2195);
const g2195=analyzeQuranAyahGrammar(a2195!,root);
assert.ok(g2195.frames.some(f=>f.kind==='PROHIBITION'));
assert.ok(g2195.frames.some(f=>f.kind==='DIVINE_PREDICATE' && String(f.predicateSurface).includes('يحب')));

const a2190=quranAyah('2:190',root); assert.ok(a2190);
const g2190=analyzeQuranAyahGrammar(a2190!,root);
assert.ok(g2190.frames.some(f=>f.kind==='DIVINE_PREDICATE' && f.polarity==='NEGATIVE' && String(f.predicateSurface).includes('يحب')));

const a496=quranAyah('49:6',root); assert.ok(a496);
const g496=analyzeQuranAyahGrammar(a496!,root);
assert.ok(g496.frames.some(f=>f.kind==='VOCATIVE'));
assert.ok(g496.frames.some(f=>['CONDITION_EXPLICIT','CONDITION_CANDIDATE'].includes(f.kind)));
assert.ok(g496.addresseeSurfaces.length>0);

const relations=mineExplicitDivineRelations(root);
assert.ok(relations.some(r=>r.reference==='Q16:90'&&r.relation==='COMMANDS'));
assert.ok(relations.some(r=>r.reference==='Q16:90'&&r.relation==='FORBIDS'));
assert.ok(relations.some(r=>r.reference==='Q2:190'&&r.relation==='DOES_NOT_LOVE'));
assert.ok(relations.some(r=>r.reference==='Q2:195'&&r.relation==='LOVES'));

assert.ok(relations.some(r=>r.reference==='Q7:28'&&r.relation==='DOES_NOT_COMMAND'));
assert.ok(!relations.some(r=>r.reference==='Q7:28'&&r.relation==='COMMANDS'));
assert.ok(relations.some(r=>r.reference==='Q4:48'&&r.relation==='DOES_NOT_FORGIVE'));
assert.ok(relations.some(r=>r.reference==='Q4:48'&&r.relation==='FORGIVES'));
assert.ok(relations.some(r=>r.reference==='Q6:144'&&r.relation==='DOES_NOT_GUIDE'));


const direction=assessQuranPassageDirections(['Q16:90','Q2:190','Q2:195'],root);
assert.equal(direction.protocol,'QURAN_PASSAGE_DIRECTION_V2');
assert.ok(direction.findings.every((x:any)=>x.grammar));

const snapshot=revelationGrammarSnapshot(root,{sampleLimit:20});
assert.equal(snapshot.protocol,'REVELATION_GRAMMAR_ENGINE_V1');
assert.equal(snapshot.version,'4.29.0');
assert.equal(snapshot.ayahCount,6236);
assert.ok(snapshot.frameCount>1000);
assert.ok((snapshot.countsByKind.DIVINE_PREDICATE??0)>100);
assert.ok((snapshot.countsByKind.PROHIBITION??0)>50);
assert.equal(snapshot.invariants.externalLexiconUsed,false);
assert.equal(snapshot.invariants.canonicalRootClaimed,false);
console.log(JSON.stringify({ok:true,frameCount:snapshot.frameCount,counts:snapshot.countsByKind,relations:relations.length},null,2));
