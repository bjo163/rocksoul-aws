import { loadQuranCorpus, normalizedArabic, quranWindow, quranTokenFrequency, type QuranAyah } from './quran-corpus.js';

type PlaceKey = 'MAKKAH'|'BAKKAH'|'UMM_AL_QURA'|'AL_MADINAH';
type PlaceHit = { place:PlaceKey; reference:string; text:string; confidence:'EXPLICIT'|'CONTEXTUAL'; role:string; explanation:string };

const patterns: Array<{place:PlaceKey; test:(t:string)=>boolean}> = [
  { place:'MAKKAH', test:t=>t.includes('مكة') },
  { place:'BAKKAH', test:t=>t.includes('بكة') },
  { place:'UMM_AL_QURA', test:t=>t.includes('ام القرى') },
  { place:'AL_MADINAH', test:t=>t.includes('المدينة') },
];

function propheticMadinahConfidence(a: QuranAyah): {confidence:'EXPLICIT'|'CONTEXTUAL';role:string;explanation:string} {
  const t=normalizedArabic(a.text);
  const propheticContext = ['رسول الله','رسوله','المؤمنين','المنافقون','الاعراب'].some(x=>t.includes(x));
  if (propheticContext) return { confidence:'CONTEXTUAL', role:'PROPHETIC_COMMUNITY_CITY_CONTEXT', explanation:'The verse says al-Madinah and also contains internal Prophetic-community vocabulary. The engine does not use external chronology to identify it.' };
  return { confidence:'EXPLICIT', role:'CITY_MENTION_UNDISAMBIGUATED', explanation:'The Arabic text explicitly says al-madinah (the city), but scripture-only mode does not assume every occurrence refers to the Prophet\'s Madinah.' };
}

export function scanQuranPlaceMentions(root=process.cwd()): PlaceHit[] {
  const out:PlaceHit[]=[];
  for (const a of loadQuranCorpus(root)) {
    const t=normalizedArabic(a.text);
    for (const p of patterns) if (p.test(t)) {
      if (p.place==='AL_MADINAH') {
        const m=propheticMadinahConfidence(a); out.push({place:p.place,reference:`Q${a.reference}`,text:a.text,...m});
      } else {
        out.push({place:p.place,reference:`Q${a.reference}`,text:a.text,confidence:'EXPLICIT',role:'PLACE_EXPLICITLY_NAMED',explanation:'The place expression is present directly in the Quranic Arabic text.'});
      }
    }
  }
  return out;
}

export function placeContextProfile(place: PlaceKey, radius=2, root=process.cwd()) {
  const hits=scanQuranPlaceMentions(root).filter(x=>x.place===place);
  const refs=hits.map(h=>h.reference.replace(/^Q/,''));
  const windows=new Map<string,QuranAyah>();
  for(const ref of refs) for(const a of quranWindow(ref,radius,root)) windows.set(a.reference,a);
  const ayahs=[...windows.values()].sort((a,b)=>a.surahNumber-b.surahNumber||a.verseNumber-b.verseNumber);
  return {
    place,
    mentionCount:hits.length,
    mentions:hits,
    windowRadius:radius,
    contextAyahCount:ayahs.length,
    contextReferences:ayahs.map(a=>`Q${a.reference}`),
    topContextTokens:quranTokenFrequency(ayahs).slice(0,30),
    boundary:'This is a profile of textual mention context, not proof that these verses were revealed at that location.'
  };
}

export function revelationGeographyReport(root=process.cwd()) {
  return {
    protocol:'REVELATION_GEOGRAPHY_V1',
    sourceMode:'QURAN_TEXT_ONLY_FOR_QURAN_GEOGRAPHY',
    places:{
      MAKKAH:placeContextProfile('MAKKAH',2,root),
      BAKKAH:placeContextProfile('BAKKAH',2,root),
      UMM_AL_QURA:placeContextProfile('UMM_AL_QURA',2,root),
      AL_MADINAH:placeContextProfile('AL_MADINAH',2,root),
    },
    invariants:{
      placeMentionIsRevelationPlace:false,
      bakkahEqualsMakkahNotAssumedFromTextAlone:true,
      ummAlQuraEqualsMakkahNotAssumedFromTextAlone:true,
      everyAlMadinahMeansPropheticMadinah:false,
      externalMakkiMadaniClassificationUsed:false
    }
  };
}
