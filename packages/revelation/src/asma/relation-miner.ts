import crypto from 'node:crypto';
import { loadQuranCorpus, normalizedArabic } from '../quran-corpus.js';
import path from 'node:path';
import { runtimeDataRevision } from '@moonwitness/persistence';
import { analyzeQuranAyahGrammar } from '../grammar/revelation-grammar.js';
import type { DivineRelation, DivineRelationType } from './types.js';

let relationCache:{key:string;value:DivineRelation[]}|null=null;

function stableId(type: string, reference: string, target: string): string {
  return `DREL-${crypto.createHash('sha256').update(`${type}|${reference}|${target}`).digest('hex').slice(0,16)}`;
}
function push(out: DivineRelation[], relation: DivineRelationType, predicateSurface: string, targetSurface: string, reference: string, text: string, grounding: DivineRelation['grounding']='SCRIPTURE_EXPLICIT'): void {
  const target=targetSurface.trim(); if(!target) return;
  out.push({relationId:stableId(relation,reference,target),book:'QURAN',relation,subject:'ALLAH',predicateSurface,targetSurface:target,reference:`Q${reference}`,text,grounding});
}
function relationType(predicate:string,negated:boolean):DivineRelationType|null {
  const p=normalizedArabic(predicate).replace(/^[وف]/,'');
  if(p.startsWith('يحب')) return negated?'DOES_NOT_LOVE':'LOVES';
  if(p.startsWith('يامر')) return negated?'DOES_NOT_COMMAND':'COMMANDS';
  if(p.startsWith('ينهى')) return 'FORBIDS';
  if(p.startsWith('يغفر')) return negated?'DOES_NOT_FORGIVE':'FORGIVES';
  if(p.startsWith('يهدي')) return negated?'DOES_NOT_GUIDE':'GUIDES';
  if(p.startsWith('يعلم')) return 'KNOWS';
  if(p.startsWith('يحكم')) return 'JUDGES';
  return null;
}

export function mineExplicitDivineRelations(root=process.cwd()): DivineRelation[] {
  const key=`${path.resolve(root)}|${runtimeDataRevision()}`; if(relationCache?.key===key) return relationCache.value;
  const out: DivineRelation[]=[];
  for(const ayah of loadQuranCorpus(root)) {
    const grammar=analyzeQuranAyahGrammar(ayah,root);
    for(const frame of grammar.frames){
      if(!['DIVINE_PREDICATE','COORDINATED_PREDICATE'].includes(frame.kind) || !frame.predicateSurface) continue;
      const type=relationType(frame.predicateSurface,frame.polarity==='NEGATIVE'); if(!type) continue;
      push(out,type,frame.predicateSurface,frame.targetSurface??'',ayah.reference,ayah.text,frame.kind==='COORDINATED_PREDICATE'?'SCRIPTURE_EXPLICIT_SAME_AYAH_CONTINUATION':'SCRIPTURE_EXPLICIT');
    }
  }
  const value=[...new Map(out.map(x=>[x.relationId,x] as const)).values()].sort((a,b)=>a.reference.localeCompare(b.reference,undefined,{numeric:true}) || a.relation.localeCompare(b.relation)); relationCache={key,value}; return value;
}

export function resetDivineRelationCacheForTests(){relationCache=null;}
