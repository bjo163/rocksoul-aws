import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { EntityRepository } from '../../../packages/persistence/src/types.js';
import { asmaEngineSnapshot } from '../asma/asma-engine.js';
import { revelationMoralGraph } from '../moral-graph/revelation-moral-graph.js';
import { fourBookCorpusSnapshot } from './four-book-corpus.js';
import { revelationBindingEngineSnapshot } from '../binding/native-revelation-binder.js';
import { revelationLifecycleSnapshot } from '../lifecycle/revelation-lifecycle.js';
import { revelationGrammarSnapshot } from '../grammar/revelation-grammar.js';
import { divineOntologySnapshot } from '../asma/divine-ontology.js';

export type RevelationSeedBook = 'QURAN'|'TAWRAT'|'ZABUR'|'INJIL';

type Loose = Record<string, any>;
export interface RevelationCorpusEntry {
  path:string;
  seedSourceId:string;
  entityType:string;
  recordCount:number;
  sha256:string;
  role:'PRIMARY_MUHAIMIN'|'CORROBORATIVE_ONLY';
  sourceClass:'CANONICAL_REFERENCE'|'TEXTUAL_WITNESS';
}
export interface RevelationCorpusManifest {
  version:string;
  protocol:string;
  policy:Loose;
  books:Record<RevelationSeedBook,RevelationCorpusEntry>;
}

const BOOKS:RevelationSeedBook[]=['QURAN','TAWRAT','ZABUR','INJIL'];
const INDEX_IDS={corpus:'REVELATION-INDEX::CORPUS',asma:'REVELATION-INDEX::ASMA',moral:'REVELATION-INDEX::MORAL-GRAPH',binding:'REVELATION-INDEX::NATIVE-BINDING',scoring:'REVELATION-INDEX::SCORING',events:'REVELATION-INDEX::EVENT-INTERPRETER',lifecycle:'REVELATION-INDEX::MORAL-LIFECYCLE',grammar:'REVELATION-INDEX::GRAMMAR',ontology:'REVELATION-INDEX::DIVINE-ONTOLOGY'} as const;

function sha256(data:Buffer|string):string { return crypto.createHash('sha256').update(data).digest('hex'); }
function countJsonl(text:string):number { return text.split(/\r?\n/).filter(line=>line.trim()).length; }

function bindingProfileSha256(root=process.cwd()):string {
  return sha256(fs.readFileSync(path.resolve(root,'data/revelation/language-concept-anchors.json')));
}
function eventProfileSha256(root=process.cwd()):string { return sha256(fs.readFileSync(path.resolve(root,'data/events/event-language-profile.json'))); }
function lifecycleProfileSha256(root=process.cwd()):string {
  const language=fs.readFileSync(path.resolve(root,'data/events/moral-lifecycle-language-profile.json'));
  const revelation=fs.readFileSync(path.resolve(root,'data/revelation/lifecycle-query-profile.json'));
  return sha256(Buffer.concat([language,revelation]));
}
function grammarProfileSha256(root=process.cwd()):string { return sha256(fs.readFileSync(path.resolve(root,'data/revelation/grammar-profile.json'))); }
function ontologyProfileSha256(root=process.cwd()):string { return sha256(fs.readFileSync(path.resolve(root,'data/revelation/divine-ontology-profile.json'))); }
function scoringProfileSha256(root=process.cwd()):string {
  const semantic=fs.readFileSync(path.resolve(root,'data/semantic/registry.json'));
  const scoring=fs.readFileSync(path.resolve(root,'data/revelation/scoring-profile.json'));
  return sha256(Buffer.concat([semantic,scoring]));
}

function canonical(value:unknown):string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value==='object') return `{${Object.entries(value as Loose).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function loadRevelationCorpusManifest(root=process.cwd()):RevelationCorpusManifest {
  return JSON.parse(fs.readFileSync(path.resolve(root,'data/divine-books/revelation-corpus-manifest.json'),'utf8')) as RevelationCorpusManifest;
}

export function revelationCorpusFingerprint(root=process.cwd()):string {
  const manifest=loadRevelationCorpusManifest(root);
  const payload=BOOKS.map(book=>({book,...manifest.books[book]}));
  return sha256(canonical(payload));
}

export function verifyRevelationCorpusFiles(root=process.cwd()) {
  const manifest=loadRevelationCorpusManifest(root);
  const books:Record<string,Loose>={};
  let totalExpected=0; let totalActual=0;
  for(const book of BOOKS){
    const expected=manifest.books[book];
    const file=path.resolve(root,expected.path);
    const exists=fs.existsSync(file);
    const raw=exists?fs.readFileSync(file):Buffer.alloc(0);
    const text=raw.toString('utf8');
    const actualCount=exists?countJsonl(text):0;
    const actualSha=exists?sha256(raw):null;
    let parseOk=exists;
    let requiredFieldsOk=exists;
    if(exists){
      try {
        for(const line of text.split(/\r?\n/).filter(Boolean)){
          const row=JSON.parse(line) as Loose;
          if(book==='QURAN') requiredFieldsOk &&= Boolean(row.reference && row.text && row.bookId==='BOOK-QURAN');
          else requiredFieldsOk &&= Boolean(row.bookCategory===book && row.sourceClass==='TEXTUAL_WITNESS' && row.ref && row.text && row.originalRevelationEquated===false);
        }
      } catch { parseOk=false; requiredFieldsOk=false; }
    }
    const ok=exists && parseOk && requiredFieldsOk && actualCount===expected.recordCount && actualSha===expected.sha256;
    books[book]={book,path:expected.path,entityType:expected.entityType,seedSourceId:expected.seedSourceId,expectedCount:expected.recordCount,actualCount,expectedSha256:expected.sha256,actualSha256:actualSha,parseOk,requiredFieldsOk,ok};
    totalExpected+=expected.recordCount; totalActual+=actualCount;
  }
  const ok=BOOKS.every(book=>books[book].ok===true);
  return {ok,protocol:'REVELATION_CORPUS_FILE_VERIFICATION_V1',version:manifest.version,manifestDriven:true,totalExpected,totalActual,fingerprint:revelationCorpusFingerprint(root),books};
}

export async function verifyRevelationSeedDatabase(repo:EntityRepository,root=process.cwd()) {
  const manifest=loadRevelationCorpusManifest(root);
  const rows=await repo.list();
  const books:Record<string,Loose>={};
  let totalExpected=0; let totalSeeded=0;
  for(const book of BOOKS){
    const entry=manifest.books[book];
    const matching=rows.filter(row=>{
      const seed=(row.payload?._seed??{}) as Loose;
      return seed.sourceId===entry.seedSourceId && row.type===entry.entityType;
    });
    const shaOk=matching.length>0 && matching.every(row=>((row.payload?._seed??{}) as Loose).sha256===entry.sha256);
    const countOk=matching.length===entry.recordCount;
    const payloadBoundaryOk=matching.every(row=>book==='QURAN' || (row.payload as Loose).sourceClass==='TEXTUAL_WITNESS' && (row.payload as Loose).originalRevelationEquated===false);
    books[book]={book,sourceId:entry.seedSourceId,entityType:entry.entityType,expectedCount:entry.recordCount,seededCount:matching.length,countOk,shaOk,payloadBoundaryOk,ok:countOk&&shaOk&&payloadBoundaryOk};
    totalExpected+=entry.recordCount; totalSeeded+=matching.length;
  }
  return {ok:BOOKS.every(book=>books[book].ok),protocol:'REVELATION_SEED_DATABASE_VERIFICATION_V1',version:manifest.version,totalExpected,totalSeeded,fingerprint:revelationCorpusFingerprint(root),books};
}

export async function buildRevelationDerivedIndexes(repo:EntityRepository,root=process.cwd()) {
  const fileVerification=verifyRevelationCorpusFiles(root);
  if(!fileVerification.ok) throw new Error('REVELATION_CORPUS_FILE_VERIFICATION_FAILED');
  const fingerprint=fileVerification.fingerprint;
  const now=new Date().toISOString();
  const corpus=fourBookCorpusSnapshot(root);
  const asma=asmaEngineSnapshot(root,{maxCandidates:250,maxFields:60});
  const moral=revelationMoralGraph(root);
  const binding=revelationBindingEngineSnapshot(root);
  const bindingProfileSha=bindingProfileSha256(root);
  const scoringProfileSha=scoringProfileSha256(root);
  const eventProfileSha=eventProfileSha256(root);
  const lifecycleProfileSha=lifecycleProfileSha256(root);
  const lifecycle=revelationLifecycleSnapshot(root);
  const grammarProfileSha=grammarProfileSha256(root);
  const grammar=revelationGrammarSnapshot(root,{sampleLimit:30});
  const ontologyProfileSha=ontologyProfileSha256(root);
  const ontology=divineOntologySnapshot(root);
  const records=[
    {id:INDEX_IDS.corpus,type:'REVELATION.DERIVED_INDEX',payload:{kind:'CORPUS',version:'4.30.0',fingerprint,builtAt:now,corpus}},
    {id:INDEX_IDS.asma,type:'REVELATION.DERIVED_INDEX',payload:{kind:'ASMA',version:'4.30.0',fingerprint,builtAt:now,protocol:asma.protocol,candidateCount:asma.candidateCount,explicitRelationCount:asma.explicitRelationCount,semanticFields:asma.semanticFields,candidates:asma.candidates}},
    {id:INDEX_IDS.moral,type:'REVELATION.DERIVED_INDEX',payload:{kind:'MORAL_GRAPH',version:'4.30.0',fingerprint,builtAt:now,protocol:moral.protocol,countsByPerspective:moral.countsByPerspective,edges:moral.edges}},
    {id:INDEX_IDS.binding,type:'REVELATION.DERIVED_INDEX',payload:{kind:'NATIVE_BINDING',version:'4.30.0',fingerprint,bindingProfileSha256:bindingProfileSha,builtAt:now,binding}},
    {id:INDEX_IDS.scoring,type:'REVELATION.DERIVED_INDEX',payload:{kind:'SCORING',version:'4.30.0',fingerprint,scoringProfileSha256:scoringProfileSha,builtAt:now,protocol:'REVELATION_MAGNITUDE_SIGNALS_V1',boundary:'Scoring formula is engineering; magnitude inputs are Revelation-grounded and 13 OUT axes are analytical lenses.'}},
    {id:INDEX_IDS.events,type:'REVELATION.DERIVED_INDEX',payload:{kind:'EVENT_INTERPRETER',version:'4.30.0',fingerprint,eventProfileSha256:eventProfileSha,builtAt:now,protocol:'SEMANTIC_EVENT_GRAPH_V1',boundary:'Event parsing is a non-normative language/epistemic layer; Revelation binding supplies moral direction.'}},
    {id:INDEX_IDS.lifecycle,type:'REVELATION.DERIVED_INDEX',payload:{kind:'MORAL_LIFECYCLE',version:'4.30.0',fingerprint,lifecycleProfileSha256:lifecycleProfileSha,builtAt:now,protocol:lifecycle.protocol,stages:lifecycle.stages,invariants:lifecycle.invariants,boundary:lifecycle.boundary}},
    {id:INDEX_IDS.grammar,type:'REVELATION.DERIVED_INDEX',payload:{kind:'GRAMMAR',version:'4.30.0',fingerprint,grammarProfileSha256:grammarProfileSha,builtAt:now,protocol:grammar.protocol,countsByKind:grammar.countsByKind,frameCount:grammar.frameCount,invariants:grammar.invariants,boundary:grammar.boundary}},
    {id:INDEX_IDS.ontology,type:'REVELATION.DERIVED_INDEX',payload:{kind:'DIVINE_ONTOLOGY',version:'4.30.0',fingerprint,ontologyProfileSha256:ontologyProfileSha,builtAt:now,protocol:ontology.protocol,counts:ontology.counts,relationFamilies:ontology.relationFamilies,clusters:ontology.clusters,invariants:ontology.invariants,boundary:ontology.boundary}}
  ];
  for(const record of records) await repo.put({id:record.id,type:record.type,version:1,createdBy:'PROCESS-REVELATION-INDEX-001',updatedBy:'PROCESS-REVELATION-INDEX-001',payload:record.payload});
  return {ok:true,protocol:'REVELATION_DERIVED_INDEX_BUILD_V7',version:'4.30.0',fingerprint,indexes:records.map(r=>({id:r.id,kind:r.payload.kind}))};
}

export async function verifyRevelationDerivedIndexes(repo:EntityRepository,root=process.cwd()) {
  const fingerprint=revelationCorpusFingerprint(root);
  const rows=await Promise.all(Object.values(INDEX_IDS).map(id=>repo.get(id)));
  const expectedBindingSha=bindingProfileSha256(root);
  const expectedScoringSha=scoringProfileSha256(root);
  const expectedEventSha=eventProfileSha256(root);
  const expectedLifecycleSha=lifecycleProfileSha256(root);
  const expectedGrammarSha=grammarProfileSha256(root);
  const expectedOntologySha=ontologyProfileSha256(root);
  const indexes=rows.map((row,index)=>{
    const id=Object.values(INDEX_IDS)[index];
    const payload=(row?.payload??{}) as Loose;
    const bindingProfileMatches=id!==INDEX_IDS.binding || payload.bindingProfileSha256===expectedBindingSha;
    const scoringProfileMatches=id!==INDEX_IDS.scoring || payload.scoringProfileSha256===expectedScoringSha;
    const eventProfileMatches=id!==INDEX_IDS.events || payload.eventProfileSha256===expectedEventSha;
    const lifecycleProfileMatches=id!==INDEX_IDS.lifecycle || payload.lifecycleProfileSha256===expectedLifecycleSha;
    const grammarProfileMatches=id!==INDEX_IDS.grammar || payload.grammarProfileSha256===expectedGrammarSha;
    const ontologyProfileMatches=id!==INDEX_IDS.ontology || payload.ontologyProfileSha256===expectedOntologySha;
    return {id,present:Boolean(row),fingerprintMatches:Boolean(row && payload.fingerprint===fingerprint),bindingProfileMatches,scoringProfileMatches,eventProfileMatches,lifecycleProfileMatches,grammarProfileMatches,ontologyProfileMatches,kind:row?payload.kind:null};
  });
  return {ok:indexes.every(x=>x.present&&x.fingerprintMatches&&x.bindingProfileMatches&&x.scoringProfileMatches&&x.eventProfileMatches&&x.lifecycleProfileMatches&&x.grammarProfileMatches&&x.ontologyProfileMatches),protocol:'REVELATION_DERIVED_INDEX_VERIFICATION_V7',version:'4.30.0',fingerprint,bindingProfileSha256:expectedBindingSha,scoringProfileSha256:expectedScoringSha,eventProfileSha256:expectedEventSha,lifecycleProfileSha256:expectedLifecycleSha,grammarProfileSha256:expectedGrammarSha,ontologyProfileSha256:expectedOntologySha,indexes};
}
