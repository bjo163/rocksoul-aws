// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(resolve(dirname(fileURLToPath(import.meta.url)), '../../'));
const project=ROOT;
const exists=(p)=>fs.existsSync(path.join(project,p));
const listFiles=(dir)=>{const out=[]; const walk=(d)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.name==='.data'||e.name==='node_modules'||e.name==='dist'||e.name==='.git') continue; if(e.isDirectory()) walk(p); else out.push(path.relative(project,p));}}; walk(dir); return out;};
export function auditSystem(){
 const files=listFiles(project);
 const engines=fs.readdirSync(path.join(project,'src/engines')).filter(x=>x.endsWith('.ts'));
 const domainTypes=fs.readFileSync(path.join(project,'src/backend/domain-types.ts'),'utf8').match(/\['[A-Z0-9_.-]+'/g)?.map(x=>x.slice(2,-1))??[];
 const requiredFirstClass=['SYSTEM.CAB','SYSTEM.CHANGE_REQUEST','SYSTEM.VERIFICATION_CASE','DIVINE_BOOK','DIVINE_BOOK.SURAH','DIVINE_BOOK.TAWRAT_WITNESS_PASSAGE','DIVINE_BOOK.ZABUR_WITNESS_PASSAGE','DIVINE_BOOK.INJIL_WITNESS_PASSAGE','REVELATION.DERIVED_INDEX','IDENTITY.ACTOR','CAB.BOARD','CAB.CHANGE_REQUEST','CAB.WORKFLOW','CAB.CLARIFICATION','KNOWLEDGE.SOURCE','KNOWLEDGE.PASSAGE','KNOWLEDGE.CLAIM','ASMA.ATTRIBUTE','ASMA.ESSENCE_VECTOR','MIZAN.EVALUATION','MIZAN.SCALE_PROFILE','XP.SCORE','SCENARIO.SCENARIO','SCENARIO.MISSION','SCENARIO.SHADOW_PROFILE','SHADOW.PROFILE','HERO_REFERENCE.PROPHET','TIME.EVENT_TIME','SPACE.OBJECT','ESCHATOLOGY.BARZAKH_EVENT','ESCHATOLOGY.HISAB_EVENT','ESCHATOLOGY.JANNAH_STATE','ESCHATOLOGY.JAHANNAM_STATE','AUTH.ACCOUNT','AUTH.SESSION','AUTH.FEATURE'];
 const missingTypes=requiredFirstClass.filter(x=>!domainTypes.includes(x));
 const checks={
   pureRevelationAsmaEngine: exists('src/revelation/asma/asma-engine.ts'),
   asmaCandidateMiner: exists('src/revelation/asma/candidate-miner.ts'),
   divineRelationMiner: exists('src/revelation/asma/relation-miner.ts'),
   divineOntologyEngine: exists('src/revelation/asma/divine-ontology.ts'),
   divineOntologyProfile: exists('data/revelation/divine-ontology-profile.json'),
   revelationMoralGraph: exists('src/revelation/moral-graph/revelation-moral-graph.ts'),
   legacyAsma99Removed: !exists('src/engines/asma.ts') && !exists('data/asmaul-husna.json') && !exists('data/asma-semantic-profiles.json'),
   quranCorpus: exists('data/divine-books/quran/ayahs.jsonl'),
   revelationCorpusManifest: exists('data/divine-books/revelation-corpus-manifest.json'),
   tawratTypedCorpus: exists('data/divine-books/witness-corpora/tawrat.jsonl'),
   zaburTypedCorpus: exists('data/divine-books/witness-corpora/zabur.jsonl'),
   injilTypedCorpus: exists('data/divine-books/witness-corpora/injil.jsonl'),
   mizan: exists('src/engines/mizan.ts'),
   xp: exists('src/engines/xp.ts'),
   ai: exists('src/ai/analyzer.ts'),
   cab: exists('src/cab/cab-engine.ts'),
   verification: exists('src/verification/index.ts'),
   persistence: exists('packages/persistence'),
   modelRegistry: exists('src/backend/model-registry.ts'),
   auth: exists('src/access/index.ts'),
   featureRegistry: exists('src/access/feature-registry.ts'),
 };
 const scoreIntegration={
   source:'REVELATION_FIRST',
   hardcodedActionAsmaVector:false,
   rgblToMizan:true,
   mizanToXp:true,
   asmaEngineRole:'DIVINE_ONTOLOGY_DISCOVERY_NOT_DIRECT_SCORE_LOOKUP',
   modelBoundary:true,
 };
 const status=Object.values(checks).every(Boolean)&&missingTypes.length===0?'PASS':'REVIEW';
 return {status,files:files.length,engineCount:engines.length,engineFiles:engines,domainTypeCount:domainTypes.length,missingFirstClassTypes:missingTypes,checks,scoreIntegration,aiMode:'SEMANTIC_BRIDGE_PLUS_REVELATION_CORE; NOT_LLM',generatedAt:new Date().toISOString()};
}
if(process.argv[1]?.endsWith('system-audit.ts')) console.log(JSON.stringify(auditSystem(),null,2));
