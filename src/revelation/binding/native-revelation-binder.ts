import fs from 'node:fs';
import path from 'node:path';
import { runtimeDataReady, runtimeDataset, runtimeDataRevision } from '../../persistence/runtime-data.js';
import { loadQuranCorpus, normalizedArabic } from '../quran-corpus.js';
import { assessQuranPassageDirections } from '../quran-passage-direction.js';
import { revelationMoralGraph } from '../moral-graph/revelation-moral-graph.js';
import type { LanguageQueryProfile, RevelationBindingDirection, RevelationNativeBinding, RevelationPassageBinding } from './types.js';

type Loose=Record<string,any>;
let cached:Loose|null=null;
let cachedRevision=-1;
let cachedRoot='';
const bindingCache=new Map<string,RevelationNativeBinding>();

function loadProfiles(root=process.cwd()):Record<string,LanguageQueryProfile>{
  const revision=runtimeDataRevision(); const resolvedRoot=path.resolve(root);
  if(cached && cachedRevision===revision && cachedRoot===resolvedRoot) return cached.profiles??{};
  cached=null; cachedRevision=revision; cachedRoot=resolvedRoot;
  if(runtimeDataReady()) {
    try { cached=runtimeDataset('data/revelation/language-concept-anchors.json') as Loose; }
    catch { cached=null; }
  }
  if(!cached){
    const file=path.resolve(root,'data/revelation/language-concept-anchors.json');
    cached=JSON.parse(fs.readFileSync(file,'utf8'));
  }
  return cached?.profiles??{};
}

const uniq=<T>(xs:T[])=>[...new Set(xs)];
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
function dirFrom(xs:string[]):RevelationBindingDirection{
  const s=new Set(xs);
  if(s.has('POSITIVE')&&s.has('NEGATIVE')) return 'MIXED';
  if(s.has('POSITIVE')) return 'POSITIVE';
  if(s.has('NEGATIVE')) return 'NEGATIVE';
  return 'UNRESOLVED';
}
function perspectiveDirection(ps:string[]):RevelationBindingDirection{
  const positive=ps.some(x=>x==='GREEN'||x==='LIGHT');
  const negative=ps.some(x=>x==='RED');
  return positive&&negative?'MIXED':positive?'POSITIVE':negative?'NEGATIVE':'UNRESOLVED';
}
function tokenIndex(tokens:string[], anchor:string):number{
  const exact=tokens.findIndex(t=>t===anchor);
  if(exact>=0) return exact;
  return tokens.findIndex(t=>t.includes(anchor));
}
function allTokenPositions(tokens:string[], anchor:string):number[]{
  const out:number[]=[];
  for(let i=0;i<tokens.length;i++) if(tokens[i]===anchor || tokens[i].includes(anchor)) out.push(i);
  return out;
}
function markerPriority(kind:string):number{
  if(['DIVINE_DOES_NOT_LOVE','DIVINE_DOES_NOT_COMMAND','DIVINE_FORBIDS','PROHIBITION_STRUCTURE','AVOIDANCE_DIRECTIVE'].includes(kind)) return 5;
  if(['NEGATIVE_CONSEQUENCE_NAKAL','CONDEMNATION_FISQ_SURFACE','PUNISHMENT_SURFACE','DIVINE_DOES_NOT_GUIDE','DIVINE_DOES_NOT_FORGIVE'].includes(kind)) return 4;
  if(['DIVINE_LOVES','DIVINE_COMMANDS'].includes(kind)) return 5;
  if(kind==='IMPERATIVE_SURFACE_CANDIDATE') return 3;
  return 1;
}
function localDirectionFor(reference:string, matched:string[], focus:string[], focusMode:string, root:string):{direction:RevelationBindingDirection;evidenceKind:string[];grammarFrameIds:string[]}{
  const report=assessQuranPassageDirections([reference],root);
  const finding=report.findings?.[0];
  const markers=Array.isArray(finding?.markers)?finding.markers:[];
  const ayah=loadQuranCorpus(root).find(x=>`Q${x.reference}`===reference);
  const ts=normalizedArabic(ayah?.text??'').split(/\s+/).filter(Boolean);
  const focusPositions=focus.flatMap(a=>allTokenPositions(ts,a));
  const fallbackPositions=matched.flatMap(a=>allTokenPositions(ts,a));
  const anchorPositions=focusPositions.length?focusPositions:fallbackPositions;
  if(!anchorPositions.length) return {direction:dirFrom(finding?.directions??[]),evidenceKind:markers.map((m:Loose)=>String(m.kind)),grammarFrameIds:uniq(markers.map((m:Loose)=>String(m.grammarFrameId??'')).filter(Boolean))};
  const scored:{direction:string;distance:number;kind:string;priority:number;index:number;grammarFrameId?:string}[]=[];
  for(const m of markers){
    const pos=Number.isFinite(Number(m.index))?Number(m.index):-1;
    if(pos<0) continue;
    const distance=Math.min(...anchorPositions.map(a=>Math.abs(a-pos)));
    scored.push({direction:String(m.direction),distance,kind:String(m.kind),priority:markerPriority(String(m.kind)),index:pos,grammarFrameId:m.grammarFrameId?String(m.grammarFrameId):undefined});
  }
  if(!scored.length) return {direction:dirFrom(finding?.directions??[]),evidenceKind:[],grammarFrameIds:[]};

  // A directive exactly on a focus action is the strongest local evidence.
  const exactKinds=['DIVINE_DOES_NOT_LOVE','DIVINE_DOES_NOT_COMMAND','DIVINE_FORBIDS','PROHIBITION_STRUCTURE','AVOIDANCE_DIRECTIVE','DIVINE_LOVES','DIVINE_COMMANDS',...(focusMode==='SUBJECT'?[]:['IMPERATIVE_SURFACE_CANDIDATE'])];
  const exact=scored.filter(x=>x.distance<=1 && exactKinds.includes(x.kind));
  if(exact.length){
    const maxP=Math.max(...exact.map(x=>x.priority));
    const best=exact.filter(x=>x.priority===maxP);
    return {direction:dirFrom(best.map(x=>x.direction)),evidenceKind:uniq(best.map(x=>x.kind)),grammarFrameIds:uniq(best.map((x:any)=>String(x.grammarFrameId??'')).filter(Boolean))};
  }

  // Negative consequence/condemnation can describe the action/subject even where the ayah's imperative is a sanction.
  const negativeConsequence=scored.filter(x=>['NEGATIVE_CONSEQUENCE_NAKAL','CONDEMNATION_FISQ_SURFACE','PUNISHMENT_SURFACE','DIVINE_DOES_NOT_GUIDE','DIVINE_DOES_NOT_FORGIVE'].includes(x.kind));
  if(negativeConsequence.length){
    const bestDistance=Math.min(...negativeConsequence.map(x=>x.distance));
    const best=negativeConsequence.filter(x=>x.distance<=bestDistance+4);
    return {direction:'NEGATIVE',evidenceKind:uniq(best.map(x=>x.kind)),grammarFrameIds:uniq(best.map(x=>String(x.grammarFrameId??'')).filter(Boolean))};
  }

  const bestDistance=Math.min(...scored.map(x=>x.distance));
  const nearby=scored.filter(x=>x.distance<=bestDistance+2);
  const maxP=Math.max(...nearby.map(x=>x.priority));
  const best=nearby.filter(x=>x.priority===maxP);
  return {direction:dirFrom(best.map(x=>x.direction)),evidenceKind:uniq(best.map(x=>x.kind)),grammarFrameIds:uniq(best.map((x:any)=>String(x.grammarFrameId??'')).filter(Boolean))};
}

export function bindActionToRevelation(input:{action?:string;text?:string;root?:string}={}):RevelationNativeBinding{
  const root=input.root??process.cwd();
  const action=String(input.action??'UNRESOLVED').toUpperCase();
  const cacheKey=`${path.resolve(root)}|${runtimeDataRevision()}|${action}`;
  const prior=bindingCache.get(cacheKey); if(prior) return prior;
  const finish=(value:RevelationNativeBinding)=>{bindingCache.set(cacheKey,value);return value;};
  const profile=loadProfiles(root)[action];
  if(!profile){
    return finish({protocol:'REVELATION_NATIVE_BINDING_V1',version:'4.29.0',action,concept:null,coverage:'NONE',empiricalRequired:false,references:[],direct:[],principles:[],direction:'UNRESOLVED',confidence:0,status:'NO_LANGUAGE_QUERY_PROFILE',pureNormativeDerivation:false,languageBridge:{used:false,normativeAuthority:false,profile:null},witnessQueryPhrases:[],passages:[],boundary:'No action-to-verse table is used. A language query profile may identify corpus search surfaces, but moral direction must come from retrieved Revelation passages.'});
  }
  if(profile.empiricalRequired || !profile.quranAnchorGroups?.length){
    return finish({protocol:'REVELATION_NATIVE_BINDING_V1',version:'4.29.0',action,concept:profile.concept,coverage:profile.coverage,empiricalRequired:Boolean(profile.empiricalRequired),references:[],direct:[],principles:[],direction:'UNRESOLVED',confidence:0,status:profile.empiricalRequired?'EMPIRICAL_BRIDGE_REQUIRED':'NO_SCRIPTURE_QUERY_ANCHORS',pureNormativeDerivation:false,languageBridge:{used:true,normativeAuthority:false,profile:profile.concept},witnessQueryPhrases:profile.witnessQueryPhrases??[],passages:[],boundary:'Language/query anchors have zero normative authority. No direction is created when the Revelation corpus does not establish one.'});
  }
  const graph=revelationMoralGraph(root);
  const passages:RevelationPassageBinding[]=[];
  for(const ayah of loadQuranCorpus(root)){
    const normalized=normalizedArabic(ayah.text);
    const matchedGroups=profile.quranAnchorGroups.map(group=>({group,matched:group.filter(a=>normalized.includes(normalizedArabic(a)))})).filter(x=>x.matched.length===x.group.length);
    if(!matchedGroups.length) continue;
    const best=matchedGroups.sort((a,b)=>b.matched.length-a.matched.length)[0];
    const reference=`Q${ayah.reference}`;
    const graphPerspectives=(graph.edges??[]).filter((e:Loose)=>String(e.reference)===reference).map((e:Loose)=>String(e.perspective));
    const local=localDirectionFor(reference,best.matched.map(normalizedArabic),(profile.focusAnchors??[]).map(normalizedArabic),String(profile.focusMode??'ACTION'),root);
    const graphDir=perspectiveDirection(graphPerspectives);
    const localDir=local.direction;
    const direction=graphDir!=='UNRESOLVED' ? (localDir!=='UNRESOLVED'&&localDir!==graphDir?'MIXED':graphDir) : localDir;
    passages.push({reference,text:ayah.text,matchedGroup:best.group,matchedTokens:best.matched,lexicalCoverage:best.matched.length/best.group.length,directions:direction==='UNRESOLVED'?[]:[direction],localDirection:direction,graphPerspectives,evidenceKind:local.evidenceKind,grammarFrameIds:local.grammarFrameIds});
  }
  passages.sort((a,b)=>{
    const rank=(d:RevelationBindingDirection)=>d==='POSITIVE'||d==='NEGATIVE'?2:d==='MIXED'?1:0;
    return rank(b.localDirection)-rank(a.localDirection) || b.lexicalCoverage-a.lexicalCoverage || a.reference.localeCompare(b.reference,undefined,{numeric:true});
  });
  const selected=passages.filter(p=>p.localDirection!=='UNRESOLVED').slice(0,5);
  const direction=dirFrom(selected.flatMap(p=>p.directions));
  const resolved=selected.length>0 && direction!=='UNRESOLVED' && direction!=='MIXED';
  const confidence=resolved ? clamp01(0.68 + Math.min(0.22,(selected.length-1)*0.05) + (selected.some(p=>p.graphPerspectives.length)?0.10:0)) : direction==='MIXED'?0.45:0;
  return finish({
    protocol:'REVELATION_NATIVE_BINDING_V1',version:'4.29.0',action,concept:profile.concept,coverage:profile.coverage,empiricalRequired:Boolean(profile.empiricalRequired),
    references:selected.map(p=>p.reference),direct:selected.map(p=>p.reference),principles:[],direction,confidence:Number(confidence.toFixed(4)),
    status:resolved?'REVELATION_NATIVE_BOUND':direction==='MIXED'?'REVELATION_NATIVE_MIXED':'REVELATION_NATIVE_UNRESOLVED',pureNormativeDerivation:resolved,
    languageBridge:{used:true,normativeAuthority:false,profile:profile.concept},witnessQueryPhrases:profile.witnessQueryPhrases??[],passages:selected,
    boundary:'The language adapter only forms Quran corpus queries. It contains no verse references and no moral direction. References and direction are discovered from the bundled Revelation text and structural/moral-graph evidence.'
  });
}


export function revelationBindingEngineSnapshot(root=process.cwd()){
  const profiles=loadProfiles(root);
  return {
    protocol:'REVELATION_NATIVE_BINDING_ENGINE_V1',
    version:'4.29.0',
    profileCount:Object.keys(profiles).length,
    actions:Object.keys(profiles).sort(),
    invariants:{
      actionToVerseTable:false,
      languageQueryHasNormativeAuthority:false,
      moralDirectionComesFromRetrievedRevelation:true,
      verseReferencesDiscoveredAtRuntime:true,
      empiricalGapMayBeInvented:false
    },
    boundary:'Language profiles may contain corpus search surfaces only. They contain no scripture references, moral direction, sin/reward values, or divine verdicts.'
  };
}

export function resetRevelationBindingCacheForTests():void{cached=null;cachedRevision=-1;cachedRoot='';bindingCache.clear();}
