import { fourBookCorpusSnapshot, loadRevelationBookCorpus } from '../corpus/four-book-corpus.js';
import { runtimeDataRevision } from '@moonwitness/persistence';

type Loose = Record<string, any>;
const norm=(s:unknown)=>String(s??'').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const tokens=(s:unknown)=>[...new Set(norm(s).split(/\s+/).filter(x=>x.length>=4))];
const resultCache=new Map<string,any>();

function search(rows:Loose[], queryTokens:string[], queryPhrases:string[], limit=5):Loose[]{
  const normalizedPhrases=[...new Set(queryPhrases.map(norm).filter(p=>p.split(/\s+/).length>=2))];
  return rows.map(r=>{
    const t=norm(r.text);
    const phraseHits=normalizedPhrases.filter(p=>t.includes(p));
    const tokenHits=queryTokens.filter(q=>t.split(/\s+/).includes(q));
    const phraseScore=normalizedPhrases.length ? phraseHits.length/normalizedPhrases.length : 0;
    const tokenScore=queryTokens.length>=2 ? tokenHits.length/queryTokens.length : 0;
    const strongPhrase=phraseHits.length>0;
    const strongToken=tokenHits.length>=2;
    return {...r,_phraseHits:phraseHits,_tokenHits:tokenHits,_score:Math.max(phraseScore,tokenScore),_strong:strongPhrase||strongToken};
  }).filter(r=>r._strong).sort((a,b)=>b._score-a._score).slice(0,limit);
}

export function fourBookCorroboration(input:{text?:string;action?:string;quranRefs?:string[];queryPhrases?:string[];root?:string}={}){
  const root=input.root??process.cwd();
  const corpus=fourBookCorpusSnapshot(root);
  const quranRefs=[...new Set((input.quranRefs??[]).map(String))];
  const queryPhrases=[...new Set((input.queryPhrases??[]).map(String).filter(Boolean))];
  const queryTokens=tokens(`${input.action??''} ${queryPhrases.join(' ')}`);
  const cacheKey=JSON.stringify([root,runtimeDataRevision(),String(input.action??''),quranRefs,queryPhrases]);
  const cached=resultCache.get(cacheKey); if(cached) return cached;
  const channels:Record<string,Loose>={};
  let matchedWitnessBooks=0;
  for(const book of ['TAWRAT','ZABUR','INJIL'] as const){
    const meta=corpus.books[book];
    if(meta.availability!=='FULL_TEXT_TEXTUAL_WITNESS'){
      channels[book]={book,status:meta.availability==='REFERENCE_INDEX'?'INDEX_ONLY_NO_SCORE':'UNAVAILABLE',matches:[],contribution:0,boundary:meta.boundary};
      continue;
    }
    const rows=loadRevelationBookCorpus(book,root); const matches=search(rows,queryTokens,queryPhrases);
    if(matches.length) matchedWitnessBooks++;
    channels[book]={book,status:matches.length?'TEXTUAL_WITNESS_MATCH':'NO_MATCH',matches:matches.map(({_phraseHits,_tokenHits,_score,_strong,...r})=>({...r,matchedPhrases:_phraseHits,matchedTokens:_tokenHits,lexicalScore:Number(_score.toFixed(4))})),contribution:matches.length?1:0};
  }
  const corroborationRatio=matchedWitnessBooks/3;
  const confidenceBoost=Number((Math.min(0.30,corroborationRatio*0.30)).toFixed(4));
  const result={
    protocol:'FOUR_BOOK_CORROBORATION_V2', version:'4.29.0',
    quran:{role:'PRIMARY_MUHAIMIN',references:quranRefs,baseAvailable:quranRefs.length>0},
    query:{languageOnly:true,normativeAuthority:false,phrases:queryPhrases},
    channels, matchedWitnessBooks, corroborationRatio:Number(corroborationRatio.toFixed(4)), confidenceBoost,
    policy:{
      witnessBooksHaveEqualChannelWeight:true,
      maxConfidenceBoost:0.30,
      perMatchedBookBoost:0.10,
      witnessCanCreateMoralDirection:false,
      witnessCanReverseQuranDirection:false,
      referenceIndexWithoutTextContributesScore:false,
      conflictShouldIncreaseUncertainty:true
    },
    boundary:'Tawrat/Zabur/Injil textual witnesses are equal corroboration channels only. Query phrases are language-only and non-normative. A strong textual match may raise grounding confidence; witness books never outvote the Quran, reverse its direction, or create a standalone divine verdict.'
  };
  resultCache.set(cacheKey,result); return result;
}

export function resetFourBookCorroborationCacheForTests(){resultCache.clear();}
