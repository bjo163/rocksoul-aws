import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

type Loose=Record<string,any>;
type Book='TAWRAT'|'ZABUR'|'INJIL';
const sets:Record<Book,string[]>={TAWRAT:['Gen','Exod','Lev','Num','Deut'],ZABUR:['Ps'],INJIL:['Matt','Mark','Luke','John']};
const output:Record<Book,string>={TAWRAT:'tawrat.jsonl',ZABUR:'zabur.jsonl',INJIL:'injil.jsonl'};
const fullTextNames:Record<string,string>={Genesis:'Gen',Exodus:'Exod',Leviticus:'Lev',Numbers:'Num',Deuteronomy:'Deut',Psalm:'Ps',Matthew:'Matt',Mark:'Mark',Luke:'Luke',John:'John'};
const categoryByOsis:Record<string,Book>={Gen:'TAWRAT',Exod:'TAWRAT',Lev:'TAWRAT',Num:'TAWRAT',Deut:'TAWRAT',Ps:'ZABUR',Matt:'INJIL',Mark:'INJIL',Luke:'INJIL',John:'INJIL'};

function arg(name:string):string|null { const i=process.argv.indexOf(name); return i>=0?process.argv[i+1]??null:null; }
function has(name:string):boolean { return process.argv.includes(name); }
function sha256(s:Buffer|string){return crypto.createHash('sha256').update(s).digest('hex');}

function parsePlainText(file:string):Record<Book,Loose[]> {
  const out:Record<Book,Loose[]>={TAWRAT:[],ZABUR:[],INJIL:[]};
  const re=/^(.+?) (\d+):(\d+)\t(.*)$/;
  for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){
    const m=re.exec(line); if(!m) continue;
    const [,bookName,ch,v,text]=m; const osis=fullTextNames[bookName]; const category=categoryByOsis[osis];
    if(!osis||!category) continue;
    out[category].push({bookCategory:category,witnessId:'KJV-PCE-TEXTUAL-WITNESS',sourceClass:'TEXTUAL_WITNESS',edition:'KJV Pure Cambridge Edition textual witness',language:'EN',osisBook:osis,bookName,chapter:Number(ch),verse:Number(v),ref:`${osis} ${ch}:${v}`,text,originalRevelationEquated:false});
  }
  return out;
}

async function loadBook(osis:string, mode:'local-json'|'fetch-json', sourceDir:string|null):Promise<Loose>{
  if(mode==='local-json'){
    if(!sourceDir) throw new Error('--source-dir is required in local JSON mode');
    return JSON.parse(fs.readFileSync(path.resolve(sourceDir,`${osis}.json`),'utf8'));
  }
  const url=`https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/kjv/books/${osis}.json`;
  const res=await fetch(url,{headers:{'user-agent':'MoonWitness-Revelation-Importer/4.24'}});
  if(!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return await res.json() as Loose;
}

async function main(){
  const root=path.resolve(arg('--root')??process.cwd());
  const sourceFile=arg('--source-file'); const sourceDir=arg('--source-dir');
  const outDir=path.resolve(root,'data/divine-books/witness-corpora'); fs.mkdirSync(outDir,{recursive:true});
  const rowsByBook:Record<Book,Loose[]>={TAWRAT:[],ZABUR:[],INJIL:[]};
  let source:Loose;

  if(sourceFile){
    const abs=path.resolve(sourceFile); Object.assign(rowsByBook,parsePlainText(abs));
    source={mode:'plain-text',file:abs,sha256:sha256(fs.readFileSync(abs)),note:'Plain-text KJV textual witness; not equated with original revelation.'};
  } else {
    const mode:'local-json'|'fetch-json'=has('--fetch')?'fetch-json':'local-json';
    for(const book of Object.keys(sets) as Book[]){
      for(const osis of sets[book]){
        const data=await loadBook(osis,mode,sourceDir);
        for(const ch of Array.isArray(data.chapters)?data.chapters:[]) for(const v of Array.isArray(ch.verses)?ch.verses:[]) rowsByBook[book].push({bookCategory:book,witnessId:`KJV-${osis}`,sourceClass:'TEXTUAL_WITNESS',edition:'KJV textual witness',language:'EN',osisBook:osis,chapter:Number(ch.chapter),verse:Number(v.number),ref:`${osis} ${ch.chapter}:${v.number}`,text:String(v.text??''),originalRevelationEquated:false});
      }
    }
    source={mode,repository:'midvash/bible-data',sourceDir};
  }

  const manifest:Loose={version:'4.29.0',generatedAt:new Date().toISOString(),source,books:{},policy:{quranPrimaryMuhaimin:true,textualWitnessMayCreateStandaloneMoralDirection:false,textualWitnessMayReverseQuran:false,equalWitnessChannelWeights:true}};
  for(const book of Object.keys(rowsByBook) as Book[]){
    const body=rowsByBook[book].map(x=>JSON.stringify(x)).join('\n')+'\n'; const p=path.resolve(outDir,output[book]); fs.writeFileSync(p,body,'utf8');
    manifest.books[book]={file:path.relative(root,p),verseCount:rowsByBook[book].length,sha256:sha256(body),role:'CORROBORATIVE_ONLY',standaloneNormativeAuthority:false};
  }
  fs.writeFileSync(path.resolve(outDir,'import-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({ok:true,...manifest},null,2));
}
main().catch(e=>{console.error(e?.stack??e);process.exitCode=1;});
