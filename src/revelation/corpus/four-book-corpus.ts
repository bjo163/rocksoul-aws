import fs from 'node:fs';
import path from 'node:path';
import { runtimeDataReady, runtimeDataset, runtimeDatasetOr } from '../../persistence/runtime-data.js';
import { loadQuranCorpus } from '../quran-corpus.js';

export type RevelationBook = 'QURAN'|'TAWRAT'|'ZABUR'|'INJIL';
export type CorpusAvailability = 'FULL_TEXT'|'FULL_TEXT_TEXTUAL_WITNESS'|'REFERENCE_INDEX'|'UNAVAILABLE';

type Loose = Record<string, any>;

const BOOKS: RevelationBook[] = ['QURAN','TAWRAT','ZABUR','INJIL'];
const CORPUS_FILE: Record<RevelationBook, string> = {
  QURAN:'data/divine-books/quran/ayahs.jsonl',
  TAWRAT: 'data/divine-books/witness-corpora/tawrat.jsonl',
  ZABUR: 'data/divine-books/witness-corpora/zabur.jsonl',
  INJIL: 'data/divine-books/witness-corpora/injil.jsonl'
};

function parseJsonl(text:string):Loose[]{ return text.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line) as Loose); }
export function loadRevelationBookCorpus(book:RevelationBook,root=process.cwd()):Loose[]{
  if(book==='QURAN') return loadQuranCorpus(root) as Loose[];
  const rel=CORPUS_FILE[book];
  if(runtimeDataReady()){
    try {
      const data=runtimeDataset(rel);
      if(Array.isArray(data)) return data as Loose[];
      if(typeof data==='string') return parseJsonl(data);
    } catch { /* local fallback below */ }
  }
  try { return parseJsonl(fs.readFileSync(path.resolve(root,rel),'utf8')); } catch { return []; }
}

export function fourBookCorpusSnapshot(root=process.cwd()) {
  const status = runtimeDatasetOr('data/revelation/corpus-status.json',{books:{}}) as Loose;
  const manifest = runtimeDatasetOr('data/divine-books/witnesses-manifest.json',{}) as Loose;
  const structure = runtimeDatasetOr('data/divine-books/witnesses-structure.json',{}) as Loose;
  const research = runtimeDatasetOr('data/revelation/scripture-research-map.json',{}) as Loose;

  const books:Record<string,Loose>={};
  const quranRows=loadRevelationBookCorpus('QURAN',root);
  books.QURAN={
    book:'QURAN', role:'PRIMARY_MUHAIMIN', availability:quranRows.length?'FULL_TEXT':'UNAVAILABLE',
    runtimeCorpus:CORPUS_FILE.QURAN, verseRecords:quranRows.length,
    runtimeSource:runtimeDataReady()?'SEEDED_RUNTIME_DB_OR_FALLBACK':'LOCAL_CORPUS',
    normativeDirectionEligible:true, corroborationEligible:true, channelWeight:1,
    sourceStatus:status?.books?.QURAN?.status ?? 'UNKNOWN'
  };

  for(const book of ['TAWRAT','ZABUR','INJIL'] as const){
    const corpusFile=CORPUS_FILE[book];
    const rows=loadRevelationBookCorpus(book,root);
    const full=rows.length>0;
    const indexRows=Array.isArray(structure?.[book])?structure[book].length:0;
    const anchorKey=book==='TAWRAT'?'tawratWitnessResearch':book==='ZABUR'?'zaburWitnessResearch':'injilWitnessResearch';
    const anchors=Array.isArray(research?.[anchorKey])?research[anchorKey]:[];
    books[book]={
      book, role:'CORROBORATIVE_TEXTUAL_WITNESS',
      availability:full?'FULL_TEXT_TEXTUAL_WITNESS':indexRows?'REFERENCE_INDEX':'UNAVAILABLE',
      runtimeCorpus:full?corpusFile:null,
      verseRecords:rows.length,
      runtimeSource:runtimeDataReady()?'SEEDED_RUNTIME_DB_OR_FALLBACK':'LOCAL_CORPUS',
      referenceIndexSections:indexRows,
      researchAnchorCount:anchors.length,
      witness:manifest?.[book] ?? null,
      normativeDirectionEligible:false,
      corroborationEligible:full,
      referenceIndexEligible:indexRows>0,
      channelWeight:1,
      sourceStatus:status?.books?.[book]?.status ?? 'UNKNOWN',
      boundary:full
        ? 'Seeded/local textual-witness text is available for corroboration only; it is not equated with the original revealed book.'
        : 'A structured witness/reference index is available, but no verse text is available; therefore it contributes zero semantic/normative score.'
    };
  }

  return {
    protocol:'FOUR_BOOK_CORPUS_V1', version:'4.29.0', books,
    activeBooks:BOOKS.filter(b=>books[b]?.availability!=='UNAVAILABLE'),
    fullTextBooks:BOOKS.filter(b=>['FULL_TEXT','FULL_TEXT_TEXTUAL_WITNESS'].includes(String(books[b]?.availability))),
    totalPassages:BOOKS.reduce((n,b)=>n+Number(books[b]?.verseRecords??0),0),
    invariants:{
      quranPrimaryMuhaimin:true,
      witnessMayCreateStandaloneMoralDirection:false,
      witnessIndexMayContributeScore:false,
      witnessTextMayOnlyCorroborate:true,
      equalWitnessChannelWeights:true,
      unavailableTextMayBeInvented:false,
      postgresRuntimeUsesTypedSeedRecords:true
    }
  };
}
