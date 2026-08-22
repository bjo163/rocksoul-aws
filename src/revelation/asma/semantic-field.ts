import { loadQuranCorpus, normalizedArabic, quranTokenFrequency } from '../quran-corpus.js';
import type { AsmaCandidate, AsmaSemanticField } from './types.js';

const STOP = new Set(['الله','والله','فالله','بالله','لله','كان','هو','ان','انه','وهو','هذا','هذه','ذلك','الذين','الذي','على','الى','في','من','عن','لهم','لكم','كما','ثم','ولا','وما','ما','لا','كل','قد']);

export function buildAsmaSemanticField(candidate: AsmaCandidate, root=process.cwd(), limit=16): AsmaSemanticField {
  const refs=new Set(candidate.references.map(x=>x.replace(/^Q/,'')));
  const ayahs=loadQuranCorpus(root).filter(a=>refs.has(a.reference));
  const phraseTokens=new Set(normalizedArabic(candidate.phrase).split(' ').filter(Boolean));
  const contextTokens=quranTokenFrequency(ayahs).filter(x=>!STOP.has(x.token) && !phraseTokens.has(x.token)).slice(0,limit);
  return { candidateId:candidate.candidateId, phrase:candidate.phrase, references:candidate.references, contextTokens, method:'CORPUS_COOCCURRENCE_ONLY' };
}

export function buildTopAsmaSemanticFields(candidates: AsmaCandidate[], root=process.cwd(), count=30): AsmaSemanticField[] {
  return candidates.filter(x=>x.status==='CORROBORATED_SURFACE_CANDIDATE').slice(0,count).map(x=>buildAsmaSemanticField(x,root));
}
