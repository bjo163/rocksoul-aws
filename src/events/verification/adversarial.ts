import { createDefaultSemanticProvider } from '../../ai/provider.js';
import { buildAiAnalysis } from '../../ai/general-analyzer.js';

type Expected={action:string;direction:string;state:string;conflict?:boolean};
interface Case{ id:string;text:string;expected:Expected;group:string; }
const suffixes=['hari ini','kemarin','di kantor','di rumah','pagi tadi','malam tadi','saat bekerja','setelah rapat','di depan teman','dalam kejadian itu'];
function variants(group:string,base:string,expected:Expected):Case[]{return suffixes.map((s,i)=>({id:`${group}${String(i+1).padStart(2,'0')}`,group,text:`${base} ${s}.`,expected}));}
export function eventAdversarialCases():Case[]{return [
  ...variants('A','Saya mencuri barang itu',{action:'THEFT',direction:'NEGATIVE',state:'NEGATIVE'}),
  ...variants('B','Saya tidak mencuri barang itu',{action:'UNRESOLVED',direction:'UNRESOLVED',state:'UNRESOLVED'}),
  ...variants('C','Saya mencuri dompet lalu mengembalikannya kepada pemilik',{action:'COMPOSITE_EVENT',direction:'MIXED',state:'VIOLATION_WITH_RESTORATION'}),
  ...variants('D','Saya salah mengambil barang milik orang lain lalu mengembalikannya kepada pemilik',{action:'RESTITUTION',direction:'POSITIVE',state:'POSITIVE'}),
  ...variants('E','Saya mengambil barang milik orang lain dengan izin pemilik',{action:'UNRESOLVED',direction:'UNRESOLVED',state:'UNRESOLVED'}),
  ...variants('F','Saya sengaja berbohong kepada pelanggan',{action:'LYING',direction:'NEGATIVE',state:'NEGATIVE'}),
  ...variants('G','Saya berbohong agar membantu teman',{action:'COMPOSITE_EVENT',direction:'MIXED',state:'PRINCIPLE_CONFLICT',conflict:true}),
  ...variants('H','Dia dituduh mencuri tanpa bukti',{action:'DEFAMATION',direction:'NEGATIVE',state:'NEGATIVE'}),
  ...variants('I','Saya verifikasi laporan sebelum membagikannya',{action:'VERIFY_CLAIM',direction:'POSITIVE',state:'POSITIVE'}),
  ...variants('J','Saya membantu teman belajar tanpa meminta imbalan',{action:'HELPING_GOOD',direction:'POSITIVE',state:'POSITIVE'})
];}
export async function runEventAdversarialSuite(root=process.cwd()){
  const provider=createDefaultSemanticProvider(root); const rows:any[]=[];
  for(const c of eventAdversarialCases()){
    const obs=await provider.analyze(c.text); const result=buildAiAnalysis(c.text,{semanticObservation:obs}); const sc=result.revelationScorecard;
    const checks={action:obs.action===c.expected.action,direction:sc.direction===c.expected.direction,state:obs.eventInterpretation?.state===c.expected.state,conflict:c.expected.conflict?obs.eventInterpretation?.conflicts?.some((x:any)=>x.status==='ACTUAL_CONFLICT')===true:true,noDivineVerdict:result.quranicMizan?.divineVerdict===false,eventGraphPresent:obs.eventGraph?.protocol==='SEMANTIC_EVENT_GRAPH_V1'};
    rows.push({id:c.id,group:c.group,text:c.text,action:obs.action,direction:sc.direction,state:obs.eventInterpretation?.state,checks,ok:Object.values(checks).every(Boolean)});
  }
  const groups=Object.fromEntries([...new Set(rows.map(r=>r.group))].map(g=>{const rs=rows.filter(r=>r.group===g);return[g,{passed:rs.filter(r=>r.ok).length,total:rs.length}];}));
  return{ok:rows.every(r=>r.ok),protocol:'EVENT_ADVERSARIAL_100_V1',version:'4.29.0',summary:{passed:rows.filter(r=>r.ok).length,total:rows.length,groups},failures:rows.filter(r=>!r.ok),boundary:'These tests validate software event parsing and Revelation binding behavior. Passing does not imply exhaustive moral knowledge or a divine verdict.'};
}
