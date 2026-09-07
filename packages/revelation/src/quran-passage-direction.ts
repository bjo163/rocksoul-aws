import { loadQuranCorpus, normalizedArabic } from './quran-corpus.js';
import { analyzeQuranAyahGrammar } from './grammar/revelation-grammar.js';

type Loose=Record<string,any>;
export type PassageDirection='POSITIVE'|'NEGATIVE';
function stripQ(ref:string){return String(ref).replace(/^Q/i,'');}

export function assessQuranPassageDirections(refs:string[],root=process.cwd()):Loose {
  const wanted=new Set(refs.map(stripQ)); const ayahs=loadQuranCorpus(root).filter(a=>wanted.has(a.reference)); const findings:Loose[]=[];
  for(const ayah of ayahs){
    const grammar=analyzeQuranAyahGrammar(ayah,root); const normalized=normalizedArabic(ayah.text); const ts=normalized.split(/\s+/).filter(Boolean); const markers:Loose[]=[];
    for(const f of grammar.frames){
      if(f.kind==='DIVINE_PREDICATE'){
        const p=normalizedArabic(f.predicateSurface??'').replace(/^[وف]/,'');
        if(p.startsWith('يحب')) markers.push({direction:f.polarity==='NEGATIVE'?'NEGATIVE':'POSITIVE',kind:f.polarity==='NEGATIVE'?'DIVINE_DOES_NOT_LOVE':'DIVINE_LOVES',surface:f.evidenceSurface,index:f.index,grammarFrameId:f.frameId});
        if(p.startsWith('يامر')) markers.push({direction:f.polarity==='NEGATIVE'?'NEGATIVE':'POSITIVE',kind:f.polarity==='NEGATIVE'?'DIVINE_DOES_NOT_COMMAND':'DIVINE_COMMANDS',surface:f.evidenceSurface,index:f.index,grammarFrameId:f.frameId});
        if(p.startsWith('يهدي') && f.polarity==='NEGATIVE') markers.push({direction:'NEGATIVE',kind:'DIVINE_DOES_NOT_GUIDE',surface:f.evidenceSurface,index:f.index,grammarFrameId:f.frameId});
        if(p.startsWith('يغفر') && f.polarity==='NEGATIVE') markers.push({direction:'NEGATIVE',kind:'DIVINE_DOES_NOT_FORGIVE',surface:f.evidenceSurface,index:f.index,grammarFrameId:f.frameId});
      }
      if(f.kind==='COORDINATED_PREDICATE' && normalizedArabic(f.predicateSurface??'').replace(/^[وف]/,'').startsWith('ينهى')) markers.push({direction:'NEGATIVE',kind:'DIVINE_FORBIDS',surface:f.evidenceSurface,index:f.index,grammarFrameId:f.frameId});
      if(f.kind==='PROHIBITION') markers.push({direction:'NEGATIVE',kind:(f.predicateSurface??'').includes('اجتنب')?'AVOIDANCE_DIRECTIVE':'PROHIBITION_STRUCTURE',surface:f.evidenceSurface,index:f.index,grammarFrameId:f.frameId});
      if(f.kind==='IMPERATIVE_CANDIDATE') markers.push({direction:'POSITIVE',kind:'IMPERATIVE_SURFACE_CANDIDATE',surface:f.evidenceSurface,heuristic:true,index:f.index,grammarFrameId:f.frameId});
    }
    for(let i=0;i<ts.length;i++){
      const token=ts[i];
      if(token.includes('نكال')) markers.push({direction:'NEGATIVE',kind:'NEGATIVE_CONSEQUENCE_NAKAL',surface:token,index:i});
      if(token.includes('فاسق')) markers.push({direction:'NEGATIVE',kind:'CONDEMNATION_FISQ_SURFACE',surface:token,index:i});
      if(token.includes('عذاب')) markers.push({direction:'NEGATIVE',kind:'PUNISHMENT_SURFACE',surface:token,index:i});
    }
    const directions=[...new Set(markers.map(m=>m.direction))]; findings.push({reference:`Q${ayah.reference}`,text:ayah.text,markers,directions,grammar:{frameCount:grammar.frames.length,conditionCount:grammar.frames.filter(f=>f.kind==='CONDITION_EXPLICIT'||f.kind==='CONDITION_CANDIDATE').length,addresseeSurfaces:grammar.addresseeSurfaces}});
  }
  return {protocol:'QURAN_PASSAGE_DIRECTION_V2',version:'4.29.0',references:refs,findings,directions:[...new Set(findings.flatMap(x=>x.directions))],boundary:'Direction markers are now generated from Revelation Grammar relation frames plus local consequence surfaces. Grammar is structural and non-normative; semantic action binding remains a separate layer.'};
}
