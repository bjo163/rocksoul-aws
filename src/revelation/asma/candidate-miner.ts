import crypto from 'node:crypto';
import { loadQuranCorpus, normalizedArabic } from '../quran-corpus.js';
import type { AsmaCandidate, AsmaSurfaceKind, AsmaCandidateStatus } from './types.js';

const CONNECTIVE = new Set(['هو','كان','ان','وهو','فان','انما','ثم','قد']);
const ACTION_PREFIXES = ['يحب','يامر','يغفر','يهدي','يعلم','يحكم','يرزق','يخلق','يفعل','يشاء','يريد','يعذب','يتوب','يسمع','يرى'];
const ALLAH_FORMS = new Set(['الله','والله','فالله','بالله','تالله','لله']);

function stableId(kind: string, phrase: string): string {
  return `ASMA-${crypto.createHash('sha256').update(`${kind}|${phrase}`).digest('hex').slice(0,16)}`;
}

function isAllahToken(token: string): boolean { return ALLAH_FORMS.has(token); }
function looksAction(token: string): boolean { return ACTION_PREFIXES.some(prefix => token.startsWith(prefix)); }
function phraseKind(first: string, frame: string): AsmaSurfaceKind {
  if (frame === 'PRONOUN_HUWA') return 'PRONOUN_FRAME_SURFACE';
  if (looksAction(first)) return 'DIVINE_ACTION_SURFACE';
  return frame === 'AFTER_ALLAH' || frame === 'BASMALA' ? 'NAME_ATTRIBUTE_SURFACE' : 'DIVINE_PREDICATE_SURFACE';
}

function addCandidate(
  map: Map<string,{kind:AsmaSurfaceKind; phrase:string; refs:Set<string>; frames:Set<string>; count:number}>,
  phrase: string,
  kind: AsmaSurfaceKind,
  reference: string,
  frame: string
): void {
  const normalized = normalizedArabic(phrase);
  if (!normalized || normalized.split(' ').some(x => x.length < 2)) return;
  const key = `${kind}|${normalized}`;
  const current = map.get(key) ?? { kind, phrase: normalized, refs:new Set<string>(), frames:new Set<string>(), count:0 };
  current.count += 1;
  current.refs.add(`Q${reference}`);
  current.frames.add(frame);
  map.set(key,current);
}

export function mineAsmaCandidates(root=process.cwd(), maxWords=2): AsmaCandidate[] {
  const found = new Map<string,{kind:AsmaSurfaceKind; phrase:string; refs:Set<string>; frames:Set<string>; count:number}>();
  for (const ayah of loadQuranCorpus(root)) {
    const normalized = normalizedArabic(ayah.text);
    const tokens = normalized.split(' ').filter(Boolean);

    for (let i=0;i<tokens.length;i++) {
      if (!isAllahToken(tokens[i])) continue;
      const after:string[]=[];
      for (let j=i+1;j<tokens.length && after.length<maxWords;j++) {
        const token=tokens[j];
        if (CONNECTIVE.has(token) && after.length===0) continue;
        if (token.length<2) continue;
        after.push(token);
      }
      if (after.length) {
        const frame = i>0 && tokens[i-1]==='بسم' ? 'BASMALA' : 'AFTER_ALLAH';
        addCandidate(found,after.join(' '),phraseKind(after[0],frame),ayah.reference,frame);
      }
    }

    // Pronoun self-reference candidates are admitted only when Allah is explicit in the same ayah.
    // This avoids silently assigning arbitrary pronouns to Allah.
    if (tokens.some(isAllahToken)) {
      for (let i=0;i<tokens.length-2;i++) {
        if (tokens[i]==='انه' && tokens[i+1]==='هو') {
          const phrase=tokens.slice(i+2,i+2+maxWords).join(' ');
          if (phrase) addCandidate(found,phrase,'PRONOUN_FRAME_SURFACE',ayah.reference,'PRONOUN_HUWA');
        }
      }
    }
  }

  return [...found.values()].map(item=>({
    candidateId:stableId(item.kind,item.phrase),
    book:'QURAN' as const,
    phrase:item.phrase,
    normalizedPhrase:normalizedArabic(item.phrase),
    kind:item.kind,
    status:(item.refs.size>=2?'CORROBORATED_SURFACE_CANDIDATE':'SCRIPTURE_ATTESTED') as AsmaCandidateStatus,
    count:item.count,
    references:[...item.refs].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),
    frames:[...item.frames].sort(),
    boundary:'Corpus-derived surface candidate only. It is not automatically declared a canonical Divine Name or Attribute.'
  })).sort((a,b)=>b.references.length-a.references.length || b.count-a.count || a.phrase.localeCompare(b.phrase,'ar'));
}
