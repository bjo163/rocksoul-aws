import { createDefaultSemanticProvider } from '../../ai/provider.js';

const cases=[
  {id:'LC01',text:'Saya mencuri barang itu',trajectory:'VIOLATION_ACTIVE'},
  {id:'LC02',text:'Saya mencuri barang itu lalu sadar bahwa saya salah',trajectory:'VIOLATION_ACKNOWLEDGED'},
  {id:'LC03',text:'Saya mencuri barang itu lalu menyesal',trajectory:'VIOLATION_ACKNOWLEDGED'},
  {id:'LC04',text:'Saya mencuri barang itu lalu berhenti melakukannya',trajectory:'CESSATION_REPORTED'},
  {id:'LC05',text:'Saya mencuri barang itu lalu bertaubat kepada Allah',trajectory:'RETURN_DECLARED'},
  {id:'LC06',text:'Saya mencuri dompet lalu mengembalikannya kepada pemilik',trajectory:'RESTITUTION_IN_PROGRESS'},
  {id:'LC07',text:'Saya mencuri barang itu lalu memperbaiki kerusakan yang saya sebabkan',trajectory:'REPAIRING'},
  {id:'LC08',text:'Saya mencuri barang itu lalu berhenti melakukannya lalu mengembalikan barang kepada pemilik lalu memperbaiki kerusakan',trajectory:'RESTORATIVE_TRAJECTORY'},
  {id:'LC09',text:'Saya mencuri dompet lalu mengembalikannya kepada pemilik lalu mencuri barang lagi',trajectory:'RELAPSE'},
  {id:'LC10',text:'Saya membantu teman belajar tanpa meminta imbalan',trajectory:'CONSTRUCTIVE'}
];
export async function runMoralLifecycleSmoke(root=process.cwd()){
  const provider=createDefaultSemanticProvider(root); const rows=[] as any[];
  for(const c of cases){
    const obs=await provider.analyze(c.text); const lc=obs.moralLifecycle;
    const ok=lc?.trajectory===c.trajectory&&lc?.invariants?.historicalViolationErasedByRestoration===false&&lc?.invariants?.repentanceDeclarationEqualsDivineAcceptance===false&&lc?.invariants?.finalDivineJudgmentComputed===false;
    rows.push({id:c.id,expected:c.trajectory,actual:lc?.trajectory,ok,quranRefs:lc?.grounding?.quranRefs??[]});
  }
  return {ok:rows.every(x=>x.ok),protocol:'MORAL_LIFECYCLE_SMOKE_10_V1',version:'4.29.0',summary:{passed:rows.filter(x=>x.ok).length,total:rows.length},rows,boundary:'Lifecycle smoke validates software state tracking only; divine acceptance remains outside the model.'};
}
