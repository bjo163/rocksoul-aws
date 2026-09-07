import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { runtimeDataReady, runtimeDataset, runtimeDataRevision } from '@moonwitness/persistence';
import { loadQuranCorpus, normalizedArabic } from '../quran-corpus.js';
import { mineAsmaCandidates } from './candidate-miner.js';
import { mineExplicitDivineRelations } from './relation-miner.js';
import type { AsmaCandidate, DivineRelation, DivineRelationType } from './types.js';

type Loose=Record<string,any>;
export type DivineOntologyConceptKind='NAME_ATTRIBUTE_SURFACE'|'DIVINE_ACTION_SURFACE'|'DIVINE_PREDICATE_SURFACE'|'PRONOUN_FRAME_SURFACE'|'MIXED_SURFACE_CONCEPT';
export interface DivineOntologyConcept{
  conceptId:string;
  kind:DivineOntologyConceptKind;
  surface:string;
  normalizedSurface:string;
  candidateIds:string[];
  references:string[];
  frames:string[];
  attestationCount:number;
  contextTokens:Array<{token:string;count:number}>;
  clusterId:string|null;
  status:'SCRIPTURE_ATTESTED_SURFACE_CONCEPT'|'CORROBORATED_SCRIPTURE_SURFACE_CONCEPT';
  canonicalDivineNameClaimed:false;
}
export interface DivineOntologyCluster{
  clusterId:string;
  conceptIds:string[];
  surfaces:string[];
  references:string[];
  sharedContextTokens:string[];
  method:'CORPUS_INTERNAL_CONTEXT_SIMILARITY';
  normativeAuthority:false;
  canonicalDivineNameClaimed:false;
}
export interface DivineRelationTargetConcept{
  targetConceptId:string;
  familyId:string;
  family:string;
  normalizedTarget:string;
  targetSurfaces:string[];
  relationTypes:DivineRelationType[];
  references:string[];
  polarity:'POSITIVE'|'NEGATIVE'|'MIXED'|'OTHER';
  scriptureExplicit:true;
  canonicalDivineNameClaimed:false;
}
export interface DivineRelationFamily{
  familyId:string;
  family:string;
  positiveRelations:DivineRelationType[];
  negativeRelations:DivineRelationType[];
  otherRelations:DivineRelationType[];
  references:string[];
  positiveTargets:string[];
  negativeTargets:string[];
  otherTargets:string[];
  polarityContrastObserved:boolean;
  canonicalDivineNameClaimed:false;
}
export interface DivineOntologySnapshot{
  protocol:'PURE_REVELATION_DIVINE_ONTOLOGY_V1';
  version:'4.30.0';
  source:'QURAN_PRIMARY_GRAMMAR_AND_CORPUS';
  concepts:DivineOntologyConcept[];
  clusters:DivineOntologyCluster[];
  relationFamilies:DivineRelationFamily[];
  relationTargets:DivineRelationTargetConcept[];
  explicitRelations:DivineRelation[];
  counts:{concepts:number;clusters:number;relationFamilies:number;relationTargets:number;explicitRelations:number;corroboratedConcepts:number;};
  invariants:Record<string,boolean>;
  boundary:string;
}

let profileCache:{key:string;value:Loose}|null=null;
let ontologyCache:{key:string;value:DivineOntologySnapshot}|null=null;
const STOP=new Set(['الله','والله','فالله','بالله','لله','هو','وهو','كان','ان','انه','هذا','هذه','ذلك','الذين','الذي','على','الى','في','من','عن','لهم','لكم','كما','ثم','قد','ولا','وما','ما','لا','كل']);
const RELATION_FAMILY:Record<DivineRelationType,string>={
  LOVES:'LOVE',DOES_NOT_LOVE:'LOVE',COMMANDS:'COMMAND',DOES_NOT_COMMAND:'COMMAND',FORBIDS:'PROHIBITION',
  FORGIVES:'FORGIVENESS',DOES_NOT_FORGIVE:'FORGIVENESS',GUIDES:'GUIDANCE',DOES_NOT_GUIDE:'GUIDANCE',KNOWS:'KNOWLEDGE',JUDGES:'JUDGEMENT'
};
const POSITIVE=new Set<DivineRelationType>(['LOVES','COMMANDS','FORGIVES','GUIDES']);
const NEGATIVE=new Set<DivineRelationType>(['DOES_NOT_LOVE','DOES_NOT_COMMAND','FORBIDS','DOES_NOT_FORGIVE','DOES_NOT_GUIDE']);

function sha(text:string){return crypto.createHash('sha256').update(text).digest('hex').slice(0,16);}
function profile(root:string):Loose{
  const key=`${path.resolve(root)}|${runtimeDataRevision()}`;
  if(profileCache?.key===key)return profileCache.value;
  let value:Loose|null=null;
  if(runtimeDataReady()){try{value=runtimeDataset('data/revelation/divine-ontology-profile.json') as Loose;}catch{value=null;}}
  if(!value)value=JSON.parse(fs.readFileSync(path.resolve(root,'data/revelation/divine-ontology-profile.json'),'utf8')) as Loose;
  const resolved=value as Loose; profileCache={key,value:resolved}; return resolved;
}
function jaccard(a:Set<string>,b:Set<string>){if(!a.size&&!b.size)return 0;let intersection=0;for(const x of a)if(b.has(x))intersection++;return intersection/(a.size+b.size-intersection||1);}
function conceptKind(items:AsmaCandidate[]):DivineOntologyConceptKind{
  const kinds=[...new Set(items.map(x=>x.kind))];
  if(kinds.length===1)return kinds[0] as DivineOntologyConceptKind;
  return 'MIXED_SURFACE_CONCEPT';
}
function refKey(ref:string){return ref.replace(/^Q/,'');}
function contextFor(refs:string[],ayahMap:Map<string,string>,limit:number){
  const freq=new Map<string,number>();
  for(const ref of refs){const text=ayahMap.get(refKey(ref));if(!text)continue;for(const token of normalizedArabic(text).split(/\s+/).filter(Boolean)){if(STOP.has(token)||token.length<2)continue;freq.set(token,(freq.get(token)??0)+1);}}
  return [...freq.entries()].map(([token,count])=>({token,count})).sort((a,b)=>b.count-a.count||a.token.localeCompare(b.token,'ar')).slice(0,limit);
}
function buildConcepts(root:string,p:Loose){
  const candidates=mineAsmaCandidates(root);
  const grouped=new Map<string,AsmaCandidate[]>();
  for(const c of candidates){const key=c.normalizedPhrase;const arr=grouped.get(key)??[];arr.push(c);grouped.set(key,arr);}
  const ayahMap=new Map(loadQuranCorpus(root).map(x=>[x.reference,x.text] as const));
  const limit=Number(p?.clustering?.contextTokenLimit??18);
  const concepts:DivineOntologyConcept[]=[];
  for(const [surface,items] of grouped){
    const refs=[...new Set(items.flatMap(x=>x.references))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    const frames=[...new Set(items.flatMap(x=>x.frames))].sort();
    concepts.push({
      conceptId:`DOC-${sha(surface)}`,kind:conceptKind(items),surface,normalizedSurface:surface,
      candidateIds:items.map(x=>x.candidateId).sort(),references:refs,frames,
      attestationCount:items.reduce((n,x)=>n+x.count,0),contextTokens:contextFor(refs,ayahMap,limit),clusterId:null,
      status:refs.length>=Number(p?.clustering?.minimumReferences??2)?'CORROBORATED_SCRIPTURE_SURFACE_CONCEPT':'SCRIPTURE_ATTESTED_SURFACE_CONCEPT',
      canonicalDivineNameClaimed:false
    });
  }
  return concepts.sort((a,b)=>b.references.length-a.references.length||b.attestationCount-a.attestationCount||a.surface.localeCompare(b.surface,'ar'));
}
function buildClusters(concepts:DivineOntologyConcept[],p:Loose){
  const eligible=concepts.filter(x=>x.status==='CORROBORATED_SCRIPTURE_SURFACE_CONCEPT');
  const parent=new Map(eligible.map(x=>[x.conceptId,x.conceptId]));
  const find=(x:string):string=>{const q=parent.get(x)!;if(q===x)return x;const r=find(q);parent.set(x,r);return r;};
  const union=(a:string,b:string)=>{const ra=find(a),rb=find(b);if(ra!==rb)parent.set(rb,ra);};
  const threshold=Number(p?.clustering?.similarityThreshold??.64), minShared=Number(p?.clustering?.minimumSharedContextTokens??3);
  const sw=Number(p?.clustering?.surfaceWeight??.2),cw=Number(p?.clustering?.contextWeight??.6),rw=Number(p?.clustering?.referenceWeight??.2);
  const sig=eligible.map(x=>({x,surface:new Set(x.normalizedSurface.split(/\s+/)),context:new Set(x.contextTokens.map(t=>t.token)),refs:new Set(x.references)}));
  for(let i=0;i<sig.length;i++)for(let j=i+1;j<sig.length;j++){
    const a=sig[i],b=sig[j];let shared=0;for(const t of a.context)if(b.context.has(t))shared++;if(shared<minShared)continue;
    const score=sw*jaccard(a.surface,b.surface)+cw*jaccard(a.context,b.context)+rw*jaccard(a.refs,b.refs);
    if(score>=threshold)union(a.x.conceptId,b.x.conceptId);
  }
  const groups=new Map<string,DivineOntologyConcept[]>();
  for(const x of eligible){const root=find(x.conceptId);const arr=groups.get(root)??[];arr.push(x);groups.set(root,arr);}
  const clusters:DivineOntologyCluster[]=[];
  for(const items of groups.values()){
    if(items.length<2)continue;
    const allContexts=items.map(x=>new Set(x.contextTokens.map(t=>t.token)));
    const shared=[...allContexts[0]].filter(t=>allContexts.filter(s=>s.has(t)).length>=Math.min(2,allContexts.length)).sort();
    const conceptIds=items.map(x=>x.conceptId).sort();
    const clusterId=`DCL-${sha(conceptIds.join('|'))}`;
    for(const item of items)item.clusterId=clusterId;
    clusters.push({clusterId,conceptIds,surfaces:items.map(x=>x.surface).sort((a,b)=>a.localeCompare(b,'ar')),references:[...new Set(items.flatMap(x=>x.references))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),sharedContextTokens:shared.slice(0,24),method:'CORPUS_INTERNAL_CONTEXT_SIMILARITY',normativeAuthority:false,canonicalDivineNameClaimed:false});
  }
  return clusters.sort((a,b)=>b.conceptIds.length-a.conceptIds.length||a.clusterId.localeCompare(b.clusterId));
}
function relationTargetConcepts(relations:DivineRelation[],families:DivineRelationFamily[]):DivineRelationTargetConcept[]{
  const familyId=new Map(families.map(x=>[x.family,x.familyId] as const));
  const grouped=new Map<string,DivineRelation[]>();
  for(const r of relations){
    const family=RELATION_FAMILY[r.relation], normalizedTarget=normalizedArabic(r.targetSurface);
    const key=`${family}|${normalizedTarget}`; const arr=grouped.get(key)??[];arr.push(r);grouped.set(key,arr);
  }
  return [...grouped.entries()].map(([key,items])=>{
    const family=RELATION_FAMILY[items[0].relation], pos=items.some(x=>POSITIVE.has(x.relation)), neg=items.some(x=>NEGATIVE.has(x.relation));
    const polarity:DivineRelationTargetConcept['polarity']=pos&&neg?'MIXED':pos?'POSITIVE':neg?'NEGATIVE':'OTHER';
    const normalizedTarget=key.slice(family.length+1);
    return {targetConceptId:`DTC-${sha(key)}`,familyId:familyId.get(family)!,family,normalizedTarget,targetSurfaces:[...new Set(items.map(x=>x.targetSurface))].sort(),relationTypes:[...new Set(items.map(x=>x.relation))].sort(),references:[...new Set(items.map(x=>x.reference))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),polarity,scriptureExplicit:true as const,canonicalDivineNameClaimed:false as const};
  }).sort((a,b)=>a.family.localeCompare(b.family)||b.references.length-a.references.length||a.normalizedTarget.localeCompare(b.normalizedTarget,'ar'));
}
function relationFamilies(relations:DivineRelation[]):DivineRelationFamily[]{
  const map=new Map<string,DivineRelation[]>();
  for(const r of relations){const family=RELATION_FAMILY[r.relation];const arr=map.get(family)??[];arr.push(r);map.set(family,arr);}
  return [...map.entries()].map(([family,items])=>{
    const pos=items.filter(x=>POSITIVE.has(x.relation)),neg=items.filter(x=>NEGATIVE.has(x.relation)),other=items.filter(x=>!POSITIVE.has(x.relation)&&!NEGATIVE.has(x.relation));
    return {familyId:`DRF-${sha(family)}`,family,positiveRelations:[...new Set(pos.map(x=>x.relation))].sort(),negativeRelations:[...new Set(neg.map(x=>x.relation))].sort(),otherRelations:[...new Set(other.map(x=>x.relation))].sort(),references:[...new Set(items.map(x=>x.reference))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),positiveTargets:[...new Set(pos.map(x=>x.targetSurface))].sort(),negativeTargets:[...new Set(neg.map(x=>x.targetSurface))].sort(),otherTargets:[...new Set(other.map(x=>x.targetSurface))].sort(),polarityContrastObserved:pos.length>0&&neg.length>0,canonicalDivineNameClaimed:false as const};
  }).sort((a,b)=>a.family.localeCompare(b.family));
}
export function divineOntologySnapshot(root=process.cwd()):DivineOntologySnapshot{
  const key=`${path.resolve(root)}|${runtimeDataRevision()}`;if(ontologyCache?.key===key)return ontologyCache.value;
  const p=profile(root),concepts=buildConcepts(root,p),clusters=buildClusters(concepts,p),explicitRelations=mineExplicitDivineRelations(root),families=relationFamilies(explicitRelations),relationTargets=relationTargetConcepts(explicitRelations,families);
  const value:DivineOntologySnapshot={protocol:'PURE_REVELATION_DIVINE_ONTOLOGY_V1',version:'4.30.0',source:'QURAN_PRIMARY_GRAMMAR_AND_CORPUS',concepts,clusters,relationFamilies:families,relationTargets,explicitRelations,counts:{concepts:concepts.length,clusters:clusters.length,relationFamilies:families.length,relationTargets:relationTargets.length,explicitRelations:explicitRelations.length,corroboratedConcepts:concepts.filter(x=>x.status==='CORROBORATED_SCRIPTURE_SURFACE_CONCEPT').length},invariants:{canonical99Hardcoded:false,humanCuratedNameListUsed:false,externalLexiconUsed:false,canonicalDivineNamePromotedAutomatically:false,canonicalArabicRootAssumed:false,clusterSimilarityIsNormativeEvidence:false,quranPrimaryMuhaimin:true,textualWitnessMayOutvoteQuran:false,explicitRevelationRemainsPrimaryEvidence:true},boundary:'This ontology organizes scripture-attested Divine-reference surfaces and explicit Divine relations into corpus-internal concepts, context clusters and polarity families. Clusters are analytical discovery structures, not automatically canonical Names, Attributes, or divine judgements.'};
  ontologyCache={key,value};return value;
}
export function resetDivineOntologyCacheForTests(){profileCache=null;ontologyCache=null;}
