import fs from 'node:fs';
import path from 'node:path';
import { runtimeDataReady, runtimeDataset } from '../persistence/runtime-data.js';

type Loose = Record<string, any>;
export interface QuranAyah { reference:string; surahNumber:number; surahName:string; verseNumber:number; text:string; [key:string]:unknown }

let cache: QuranAyah[] | null = null;

export function stripArabicMarks(value: string): string {
  return value.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/ـ/g,'').replace(/ٱ/g,'ا').normalize('NFKC');
}

export function normalizedArabic(value: string): string {
  return stripArabicMarks(String(value ?? '')).replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
}

export function loadQuranCorpus(root = process.cwd()): QuranAyah[] {
  if (cache) return cache;
  if (runtimeDataReady()) {
    try {
      const data = runtimeDataset('data/divine-books/quran/ayahs.jsonl');
      if (Array.isArray(data)) return cache = data as QuranAyah[];
      if (typeof data === 'string') return cache = data.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    } catch {
      // Runtime repositories may be initialized before this JSONL collection is seeded.
      // Fall through to the canonical local JSONL parser instead of treating JSONL as JSON.
    }
  }
  const file = path.resolve(root, 'data/divine-books/quran/ayahs.jsonl');
  const text = fs.readFileSync(file, 'utf8');
  return cache = text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as QuranAyah);
}

export function quranAyah(reference: string, root = process.cwd()): QuranAyah | null {
  const ref = String(reference).replace(/^Q/i,'');
  return loadQuranCorpus(root).find(a => a.reference === ref) ?? null;
}

export function quranWindow(reference: string, radius = 2, root = process.cwd()): QuranAyah[] {
  const hit = quranAyah(reference, root); if (!hit) return [];
  return loadQuranCorpus(root).filter(a => a.surahNumber === hit.surahNumber && Math.abs(a.verseNumber-hit.verseNumber) <= radius);
}

export function searchQuranArabic(term: string, root = process.cwd()): QuranAyah[] {
  const needle = normalizedArabic(term);
  if (!needle) return [];
  return loadQuranCorpus(root).filter(a => normalizedArabic(a.text).includes(needle));
}

export function quranTokenFrequency(ayahs: QuranAyah[]): Array<{token:string;count:number}> {
  const stop = new Set(['من','في','على','الى','عن','ما','لا','ان','إن','و','او','هو','هي','هم','ثم','قد','كان','كما','هذا','هذه','ذلك','الذي','الذين','لهم','لكم','له','به','بها','يا']);
  const counts = new Map<string,number>();
  for (const ayah of ayahs) for (const token of normalizedArabic(ayah.text).split(' ')) {
    if (!token || token.length < 3 || stop.has(token)) continue;
    counts.set(token,(counts.get(token) ?? 0)+1);
  }
  return [...counts.entries()].map(([token,count])=>({token,count})).sort((a,b)=>b.count-a.count || a.token.localeCompare(b.token,'ar'));
}

export function resetQuranCorpusCacheForTests(): void { cache = null; }
