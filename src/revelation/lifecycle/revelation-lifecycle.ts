import { runtimeDatasetOr, runtimeDataRevision } from '../../persistence/runtime-data.js';
import { loadQuranCorpus, normalizedArabic } from '../quran-corpus.js';
import { fourBookCorroboration } from '../corroboration/four-book-corroboration.js';

type Loose=Record<string,any>;
const uniq=<T>(xs:T[])=>[...new Set(xs)];
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
const stageCache=new Map<string,LifecycleGrounding>();
let snapshotCache:{key:string;value:any}|null=null;

function profile():Loose{return runtimeDatasetOr('data/revelation/lifecycle-query-profile.json',{stages:{}}) as Loose;}

export interface LifecycleGrounding {
  stage:string;
  quranRefs:string[];
  passages:Array<{reference:string;text:string;matchedGroup:string[]}>;
  quranConfidence:number;
  corroboration:Loose|null;
  confidence:number;
  normativeAuthority:false;
  boundary:string;
}

export function groundRevelationLifecycleStage(stage:string,root=process.cwd()):LifecycleGrounding{
  const cacheKey=`${root}|${runtimeDataRevision()}|${stage}`;
  const cached=stageCache.get(cacheKey); if(cached) return cached;
  const p=profile()?.stages?.[stage] as Loose|undefined;
  if(!p) { const empty={stage,quranRefs:[],passages:[],quranConfidence:0,corroboration:null,confidence:0,normativeAuthority:false as const,boundary:'No lifecycle query profile exists for this analytical stage.'}; stageCache.set(cacheKey,empty); return empty; }
  const groups=(Array.isArray(p.quranAnchorGroups)?p.quranAnchorGroups:[]) as string[][];
  const passages:Array<{reference:string;text:string;matchedGroup:string[]}>=[];
  for(const ayah of loadQuranCorpus(root)){
    const text=normalizedArabic(ayah.text);
    const matched=groups.find(group=>group.every(anchor=>text.includes(normalizedArabic(anchor))));
    if(matched) passages.push({reference:`Q${ayah.reference}`,text:ayah.text,matchedGroup:matched});
  }
  const selected=passages.slice(0,5);
  const quranConfidence=selected.length?clamp01(.68+Math.min(.22,(selected.length-1)*.05)):0;
  const corroboration=fourBookCorroboration({action:`LIFECYCLE_${stage}`,quranRefs:selected.map(x=>x.reference),queryPhrases:Array.isArray(p.witnessQueryPhrases)?p.witnessQueryPhrases:[],root});
  const confidence=selected.length?clamp01(quranConfidence+Number(corroboration?.confidenceBoost??0)):0;
  const result={stage,quranRefs:selected.map(x=>x.reference),passages:selected,quranConfidence:Number(quranConfidence.toFixed(4)),corroboration,confidence:Number(confidence.toFixed(4)),normativeAuthority:false as const,boundary:'Lifecycle grounding shows that Revelation contains related return/repair language. It does not prove a person\'s repentance was sincere or accepted by Allah, and witness books only corroborate confidence.'}; stageCache.set(cacheKey,result); return result;
}

export function revelationLifecycleSnapshot(root=process.cwd()){
  const key=`${root}|${runtimeDataRevision()}`; if(snapshotCache?.key===key) return snapshotCache.value;
  const stages=Object.keys(profile()?.stages??{});
  const grounded=Object.fromEntries(stages.map(stage=>[stage,groundRevelationLifecycleStage(stage,root)]));
  const value={protocol:'REVELATION_MORAL_LIFECYCLE_GROUNDING_V1',version:'4.29.0',stages:grounded,invariants:{quranPrimaryMuhaimin:true,witnessConfidenceOnly:true,divineAcceptanceComputed:false,finalForgivenessComputed:false,restorationErasesHistoricalViolation:false},boundary:'This snapshot discovers lifecycle-related Revelation passages from corpus search surfaces; it is not a revealed lifecycle formula.'}; snapshotCache={key,value}; return value;
}

export function resetRevelationLifecycleCacheForTests(){stageCache.clear();snapshotCache=null;}
