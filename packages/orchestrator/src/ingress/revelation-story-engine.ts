import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, readFile as readText } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomInt } from 'node:crypto';
import { loadQuranNarrativePatterns, type QuranNarrativePattern } from './quran-narrative-pattern-engine.js';

export interface RevelationOrderRow { revelation_order:number; surah_number:number; source:string; confidence:string; }
export interface AyahRecord { reference:string; surahNumber:number; verseNumber:number; surahName:string; text:string; }
export interface RevelationStoryCandidate {
  id:string;
  kind:'SURAH_CONTEXT'|'HISTORICAL_PASSAGE'|'ASBAB_CONTEXT'|'QURAN_NARRATIVE';
  references:string[];
  ayahCount:number;
  revelationOrder?:number;
  sourceClass:string;
  sourceRefs:string[];
  status:'STRUCTURAL_CANDIDATE'|'REPORTED_CONTEXT';
}

const ORDER_PATH=resolve(resolve(dirname(fileURLToPath(import.meta.url)), '../../../../'),'data/revelation/revelation-order.json');
const AYAH_PATH=resolve(resolve(dirname(fileURLToPath(import.meta.url)), '../../../../'),'data/divine-books/quran/ayahs.jsonl');
const PATTERN_PATH=resolve(resolve(dirname(fileURLToPath(import.meta.url)), '../../../../'),'data/revelation/revelation-patterns.json');

async function loadAyahs():Promise<AyahRecord[]> {
  const raw=await readText(AYAH_PATH,'utf8');
  return raw.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line) as AyahRecord);
}

export async function buildStructuralStoryCandidates(limit=114):Promise<RevelationStoryCandidate[]> {
  const [orderRaw,ayahs]=await Promise.all([readFile(ORDER_PATH,'utf8'),loadAyahs()]);
  const order=JSON.parse(orderRaw) as {rows:RevelationOrderRow[]};
  const grouped=new Map<number,AyahRecord[]>();
  for(const ayah of ayahs){ const arr=grouped.get(ayah.surahNumber)??[]; arr.push(ayah); grouped.set(ayah.surahNumber,arr); }
  return order.rows.slice(0,limit).map(row=>{
    const verses=grouped.get(row.surah_number)??[];
    const first=verses[0]; const last=verses[verses.length-1];
    return {
      id:`SURAH-${String(row.surah_number).padStart(3,'0')}-ORDER-${String(row.revelation_order).padStart(3,'0')}`,
      kind:'SURAH_CONTEXT',
      references:first&&last?[`${first.reference}-${last.verseNumber}`]:[],
      ayahCount:verses.length,
      revelationOrder:row.revelation_order,
      sourceClass:'STRUCTURAL_QURAN_DATA',
      sourceRefs:[row.source],
      status:'STRUCTURAL_CANDIDATE'
    };
  });
}


export async function listQuranNarrativeStoryCandidates():Promise<RevelationStoryCandidate[]> {
  const patterns = await loadQuranNarrativePatterns();
  return patterns.map((pattern: QuranNarrativePattern) => ({
    id: pattern.id,
    kind: 'QURAN_NARRATIVE',
    references: pattern.references,
    ayahCount: pattern.references.reduce((sum, ref) => {
      const match = ref.match(/:(\d+)(?:-(\d+))?$/);
      if (!match) return sum;
      return sum + (match[2] ? Number(match[2]) - Number(match[1]) + 1 : 1);
    }, 0),
    sourceClass: 'QURAN_EXPLICIT_NARRATIVE_ANCHOR',
    sourceRefs: pattern.references,
    status: 'STRUCTURAL_CANDIDATE'
  }));
}

export async function listHistoricalPassagePatterns():Promise<RevelationStoryCandidate[]> {
  const raw=await readFile(PATTERN_PATH,'utf8');
  const data=JSON.parse(raw) as {patterns:Array<{id:string;passage:string;selection:string;count?:number;evidenceClass?:string;references?:string[]}>};
  return data.patterns.filter(p=>p.passage && p.selection!=='DO_NOT_USE_FOR_AUTOMATIC_SCHEDULING').map(p=>({
    id:p.id,kind:'HISTORICAL_PASSAGE',references:[p.passage],ayahCount:p.count??0,sourceClass:p.evidenceClass??'',sourceRefs:p.references??[],status:'REPORTED_CONTEXT'
  }));
}

export async function chooseStoryCandidate(seed=randomInt(0,1000000)):Promise<RevelationStoryCandidate>{
  const reported=await listHistoricalPassagePatterns();
  if(seed%5===0 && reported.length) return reported[seed%reported.length];
  const structural=await buildStructuralStoryCandidates();
  if(!structural.length) throw new Error('NO_STORY_CANDIDATES');
  return structural[seed%structural.length];
}