import { loadQuranCorpus, normalizedArabic } from '../quran-corpus.js';
import { revelationMoralGraph } from '../moral-graph/revelation-moral-graph.js';
import type { RevelationNativeBinding } from '../binding/types.js';
import { runtimeDatasetOr } from '../../persistence/runtime-data.js';

export type RevelationDirection = 'POSITIVE'|'NEGATIVE'|'MIXED'|'UNRESOLVED';
export interface RevelationImpactAxis {
  id:string;
  label:string;
  value:number;
  relevance:number;
  matchedAnchors:string[];
  references:string[];
}
export interface RevelationMagnitudeSignals {
  protocol:string;
  version:string;
  direction:RevelationDirection;
  magnitude:number;
  rgbl:{R:number;G:number;B:number;L:number};
  impactVector:number[];
  impactAxes:RevelationImpactAxis[];
  features:Record<string,number>;
  references:string[];
  pureRevelationInputs:boolean;
  boundary:string;
}

type Loose=Record<string,any>;
const clamp01=(n:unknown)=>{const v=Number(n??0);return Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;};
const round=(n:number)=>Number(n.toFixed(4));
const uniq=<T>(xs:T[])=>[...new Set(xs)];


function scoringProfile():Loose { return runtimeDatasetOr('data/revelation/scoring-profile.json',{}) as Loose; }


function coverageStrength(coverage:string):number {
  const x=String(coverage??'NONE').toUpperCase();
  return x==='DIRECT'?1:x==='MIXED'?0.78:x==='INDIRECT'?0.35:0;
}
function sign(direction:RevelationDirection):number { return direction==='POSITIVE'?1:direction==='NEGATIVE'?-1:0; }
function markerStrength(binding:RevelationNativeBinding):number {
  const kinds=(binding.passages??[]).flatMap(p=>p.evidenceKind??[]);
  if(!kinds.length) return 0;
  const weights=scoringProfile().markerWeights??{};
  return Math.max(...kinds.map(k=>Number(weights[String(k)]??weights.DEFAULT??0.55)));
}
function repetitionStrength(binding:RevelationNativeBinding):number {
  const n=uniq((binding.references??[]).map(String)).length;
  return n?clamp01(0.55+Math.max(0,n-1)*0.11):0;
}
function graphStrength(binding:RevelationNativeBinding,root:string):number {
  const refs=new Set((binding.references??[]).map(String));
  if(!refs.size) return 0;
  const graph=revelationMoralGraph(root);
  const edges=(graph.edges??[]).filter((e:Loose)=>refs.has(String(e.reference)));
  if(!edges.length) return 0;
  const explicit=edges.filter((e:Loose)=>String(e.authority)==='SCRIPTURE_EXPLICIT').length;
  return clamp01(0.72 + Math.min(0.28,explicit*0.07));
}

function canonicalToken(value:string):string {
  let x=normalizedArabic(value);
  x=x.replace(/^[وفبلك]/,'');
  if(x.startsWith('ال') && x.length>4) x=x.slice(2);
  return x;
}
function tokenMatchesAnchor(token:string,anchor:string):boolean {
  const t=canonicalToken(token); const a=canonicalToken(anchor);
  if(!t||!a) return false;
  if(t===a) return true;
  // Stemming here is intentionally conservative: short roots must match exactly.
  return a.length>=4 && t.startsWith(a);
}
function localPassageWindows(binding:RevelationNativeBinding,root:string):Array<{reference:string;tokens:string[]}> {
  const quran=new Map(loadQuranCorpus(root).map(a=>[`Q${a.reference}`,a]));
  return (binding.passages??[]).map(p=>{
    const ayah=quran.get(String(p.reference));
    const tokens=normalizedArabic(ayah?.text??p.text??'').split(/\s+/).filter(Boolean);
    const matched=(p.matchedTokens??[]).map(normalizedArabic).filter(Boolean);
    const positions:number[]=[];
    for(let i=0;i<tokens.length;i++) if(matched.some(a=>tokenMatchesAnchor(tokens[i],a))) positions.push(i);
    if(!positions.length) return {reference:String(p.reference),tokens:[]};
    const keep=new Set<number>();
    const radius=Math.max(1,Number(scoringProfile()?.impact?.localWindowRadius??8));
    for(const pos of positions) for(let i=Math.max(0,pos-radius);i<=Math.min(tokens.length-1,pos+radius);i++) keep.add(i);
    return {reference:String(p.reference),tokens:[...keep].sort((a,b)=>a-b).map(i=>tokens[i])};
  }).filter(x=>x.tokens.length>0);
}

function axisSignals(binding:RevelationNativeBinding,semanticRegistry:Loose,root:string,magnitude:number):RevelationImpactAxis[] {
  const axes=Array.isArray(semanticRegistry?.vectors?.impact?.axes)?semanticRegistry.vectors.impact.axes:[];
  const passages=localPassageWindows(binding,root);
  const s=sign(binding.direction as RevelationDirection);
  return axes.map((axis:Loose)=>{
    const anchors=(Array.isArray(axis.quranAnchors)?axis.quranAnchors:[]).map((x:string)=>normalizedArabic(x)).filter(Boolean);
    const hitRefs:string[]=[]; const hitAnchors:string[]=[];
    for(const p of passages){
      const hits=anchors.filter((a:string)=>p.tokens.some(token=>tokenMatchesAnchor(token,a)));
      if(hits.length){hitRefs.push(p.reference);hitAnchors.push(...hits);}
    }
    const anchorCount=uniq(hitAnchors).length;
    const passageCount=uniq(hitRefs).length;
    const ip=scoringProfile()?.impact??{};
    const relevance=anchorCount?clamp01(Number(ip.baseRelevance??0.38)+Math.min(Number(ip.maxAnchorContribution??0.38),anchorCount*Number(ip.perAnchor??0.12))+Math.min(Number(ip.maxPassageContribution??0.24),Math.max(0,passageCount-1)*Number(ip.perAdditionalPassage??0.08))):0;
    return {id:String(axis.id),label:String(axis.label),value:round(s*magnitude*relevance),relevance:round(relevance),matchedAnchors:uniq(hitAnchors),references:uniq(hitRefs)};
  });
}

export function deriveRevelationMagnitudeSignals(input:{binding?:RevelationNativeBinding|null;semanticRegistry?:Loose;root?:string}={}):RevelationMagnitudeSignals {
  const root=input.root??process.cwd();
  const binding=input.binding??null;
  if(!binding || binding.pureNormativeDerivation!==true || !['POSITIVE','NEGATIVE'].includes(String(binding.direction))){
    const axes=Array.isArray(input.semanticRegistry?.vectors?.impact?.axes)?input.semanticRegistry.vectors.impact.axes:[];
    return {
      protocol:'REVELATION_MAGNITUDE_SIGNALS_V1',version:'4.29.0',direction:(binding?.direction??'UNRESOLVED') as RevelationDirection,magnitude:0,
      rgbl:{R:0,G:0,B:0,L:0},impactVector:Array.from({length:Number(input.semanticRegistry?.vectors?.impact?.length??13)},()=>0),
      impactAxes:axes.map((a:Loose)=>({id:String(a.id),label:String(a.label),value:0,relevance:0,matchedAnchors:[],references:[]})),
      features:{bindingConfidence:0,markerStrength:0,graphStrength:0,repetitionStrength:0,coverageStrength:0},references:binding?.references??[],pureRevelationInputs:false,
      boundary:'No Revelation-grounded magnitude is produced without a resolved native Revelation direction. Zero means unresolved analytical magnitude, not moral neutrality.'
    };
  }
  const bindingConfidence=clamp01(binding.confidence);
  const markers=markerStrength(binding);
  const graph=graphStrength(binding,root);
  const repetition=repetitionStrength(binding);
  const coverage=coverageStrength(binding.coverage);
  // Formula is engineering, but every magnitude input below is derived from retrieved Revelation structure.
  const mw=scoringProfile().magnitudeWeights??{};
  const magnitude=clamp01(bindingConfidence*Number(mw.bindingConfidence??0.30) + markers*Number(mw.markerStrength??0.30) + graph*Number(mw.graphStrength??0.18) + repetition*Number(mw.repetitionStrength??0.12) + coverage*Number(mw.coverageStrength??0.10));
  const impactAxes=axisSignals(binding,input.semanticRegistry??{},root,magnitude);
  const repair=impactAxes.find(x=>x.label==='REPAIR')?.relevance??0;
  const epistemic=clamp01(bindingConfidence*0.7 + coverage*0.3);
  const direction=binding.direction as RevelationDirection;
  const rgbl={
    R:direction==='NEGATIVE'?-round(magnitude):0,
    G:direction==='POSITIVE'?round(magnitude):0,
    B:round(epistemic),
    L:direction==='POSITIVE'&&repair>0?round(magnitude*repair):0
  };
  return {
    protocol:'REVELATION_MAGNITUDE_SIGNALS_V1',version:'4.29.0',direction,magnitude:round(magnitude),rgbl,
    impactVector:impactAxes.map(x=>x.value),impactAxes,
    features:{bindingConfidence:round(bindingConfidence),markerStrength:round(markers),graphStrength:round(graph),repetitionStrength:round(repetition),coverageStrength:round(coverage)},
    references:binding.references??[],pureRevelationInputs:true,
    boundary:'Magnitude is a software-derived analytical strength from retrieved Revelation structure (explicit directive markers, graph relations, repetition, coverage, and binding confidence). It is not a revealed sin/reward quantity, and the 13 OUT axes are engineering lenses whose relevance must be text-grounded by Quran anchors.'
  };
}
