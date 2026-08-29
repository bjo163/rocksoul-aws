import { scriptureCorpusStatus, scriptureSourcePolicy } from '../source-policy.js';
import { mineAsmaCandidates } from './candidate-miner.js';
import type { AsmaCandidate } from './types.js';

export function asmaEngineCandidates(root=process.cwd()): AsmaCandidate[] { return mineAsmaCandidates(root); }

export function asmaEngineSnapshot(root=process.cwd(), options:{maxCandidates?:number;maxFields?:number}={} ) {
  const allCandidates=mineAsmaCandidates(root);
  const maxCandidates=Math.max(1,Number(options.maxCandidates ?? 120));
  const maxFields=Math.max(0,Number(options.maxFields ?? 30));
  return {
    protocol:'PURE_REVELATION_ASMA_V2',
    version:'4.30.0',
    sourcePolicy:scriptureSourcePolicy(),
    corpusStatus:scriptureCorpusStatus(),
    activeCorpora:['QURAN'],
    activeMiningCorpora:['QURAN'],
    referenceIndexCorpora:[],
    corroborativeTextCorpora:['TAWRAT','ZABUR','INJIL'],
    pendingFullTextCorpora:[],
    unavailableCorpora:[],
    candidates:allCandidates.slice(0,maxCandidates),
    candidateCount:allCandidates.length,
    semanticFields:[],
    divineOntology:null,
    invariants:{
      canonical99Hardcoded:false,
      humanCuratedNameListUsed:false,
      externalLexiconUsed:false,
      externalNormativeSourceUsed:false,
      candidateEqualsCanonicalName:false,
      unavailableCorpusMayBeSynthesized:false,
      corpusSurfaceAndContextRemainPrimaryEvidence:true,
      deepOntologyIsCorpusDerived:true,
      ontologyClusterIsNotCanonicalName:true
    },
    boundary:'Asma Engine mines Divine-reference surface candidates, explicit relations, co-occurrence fields and a corpus-internal Divine ontology. Surface concepts and clusters are not automatically promoted to canonical Names or Attributes.'
  };
}

export function selectAsmaReminderCandidates(seed=0, count=2, root=process.cwd()): AsmaCandidate[] {
  const pool=mineAsmaCandidates(root).filter(x=>x.status==='CORROBORATED_SURFACE_CANDIDATE' && x.kind!=='DIVINE_ACTION_SURFACE');
  if(!pool.length) return [];
  const selected:AsmaCandidate[]=[];
  for(let i=0;i<Math.min(count,pool.length);i++) {
    const idx=Math.abs((seed*(i+3)+i*17))%pool.length;
    let item=pool[idx];
    let guard=0;
    while(selected.some(x=>x.candidateId===item.candidateId) && guard<pool.length) { item=pool[(idx+guard+1)%pool.length]; guard++; }
    selected.push(item);
  }
  return selected;
}