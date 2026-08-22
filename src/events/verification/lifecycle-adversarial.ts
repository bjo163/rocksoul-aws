import { createDefaultSemanticProvider } from '../../ai/provider.js';
import { buildAiAnalysis } from '../../ai/general-analyzer.js';

type Expected={trajectory:string;historicalViolation:boolean;activeViolation?:boolean;relapse?:boolean;stage?:string};
interface Case{id:string;group:string;text:string;expected:Expected;}
const suffixes=['hari ini','kemarin','di kantor','di rumah','pagi tadi','malam tadi','saat bekerja','setelah rapat','di depan teman','dalam kejadian itu'];
function variants(group:string,base:string,expected:Expected):Case[]{return suffixes.map((s,i)=>({id:`${group}${String(i+1).padStart(2,'0')}`,group,text:`${base} ${s}.`,expected}));}
export function lifecycleAdversarialCases():Case[]{return [
  ...variants('A','Saya mencuri barang itu',{trajectory:'VIOLATION_ACTIVE',historicalViolation:true,activeViolation:true}),
  ...variants('B','Saya mencuri barang itu lalu sadar bahwa saya salah',{trajectory:'VIOLATION_ACKNOWLEDGED',historicalViolation:true,stage:'AWARENESS'}),
  ...variants('C','Saya mencuri barang itu lalu menyesal',{trajectory:'VIOLATION_ACKNOWLEDGED',historicalViolation:true,stage:'REGRET'}),
  ...variants('D','Saya mencuri barang itu lalu berhenti melakukannya',{trajectory:'CESSATION_REPORTED',historicalViolation:true,activeViolation:false,stage:'CESSATION'}),
  ...variants('E','Saya mencuri barang itu lalu bertaubat kepada Allah',{trajectory:'RETURN_DECLARED',historicalViolation:true,activeViolation:false,stage:'RETURN_REPENTANCE'}),
  ...variants('F','Saya mencuri dompet lalu mengembalikannya kepada pemilik',{trajectory:'RESTITUTION_IN_PROGRESS',historicalViolation:true,activeViolation:false,stage:'RESTITUTION'}),
  ...variants('G','Saya mencuri barang itu lalu memperbaiki kerusakan yang saya sebabkan',{trajectory:'REPAIRING',historicalViolation:true,activeViolation:false,stage:'REPAIR'}),
  ...variants('H','Saya mencuri barang itu lalu berhenti melakukannya lalu mengembalikan barang kepada pemilik lalu memperbaiki kerusakan',{trajectory:'RESTORATIVE_TRAJECTORY',historicalViolation:true,activeViolation:false,stage:'REPAIR'}),
  ...variants('I','Saya mencuri dompet lalu mengembalikannya kepada pemilik lalu mencuri barang lagi',{trajectory:'RELAPSE',historicalViolation:true,activeViolation:true,relapse:true}),
  ...variants('J','Saya membantu teman belajar tanpa meminta imbalan',{trajectory:'CONSTRUCTIVE',historicalViolation:false,activeViolation:false})
];}
export async function runMoralLifecycleAdversarialSuite(root=process.cwd()){
  const provider=createDefaultSemanticProvider(root); const rows:any[]=[];
  for(const c of lifecycleAdversarialCases()){
    const obs=await provider.analyze(c.text); const result=buildAiAnalysis(c.text,{semanticObservation:obs}); const lc=obs.moralLifecycle;
    const checks:any={trajectory:lc?.trajectory===c.expected.trajectory,historicalViolation:lc?.historicalViolation===c.expected.historicalViolation,noHistoryErase:lc?.restoration?.historyErased===false,noDivineAcceptance:lc?.restoration?.divineForgivenessAccepted===null&&lc?.restoration?.divineRepentanceAccepted===null,noFinalDivineVerdict:result.quranicMizan?.divineVerdict===false};
    if(c.expected.activeViolation!==undefined) checks.activeViolation=lc?.activeViolation===c.expected.activeViolation;
    if(c.expected.relapse!==undefined) checks.relapse=lc?.relapse===c.expected.relapse;
    if(c.expected.stage) checks.stage=lc?.timeline?.some((x:any)=>x.stage===c.expected.stage)===true;
    rows.push({id:c.id,group:c.group,text:c.text,trajectory:lc?.trajectory,checks,ok:Object.values(checks).every(Boolean)});
  }
  const groups=Object.fromEntries([...new Set(rows.map(r=>r.group))].map(g=>{const rs=rows.filter(r=>r.group===g);return[g,{passed:rs.filter(r=>r.ok).length,total:rs.length}];}));
  return {ok:rows.every(r=>r.ok),protocol:'MORAL_LIFECYCLE_ADVERSARIAL_100_V1',version:'4.29.0',summary:{passed:rows.filter(r=>r.ok).length,total:rows.length,groups},failures:rows.filter(r=>!r.ok),boundary:'This suite validates software lifecycle interpretation and Revelation grounding. It does not validate sincerity, divine acceptance of repentance, forgiveness by Allah, or final judgment.'};
}
