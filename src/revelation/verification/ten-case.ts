import { createDefaultSemanticProvider } from '../../ai/provider.js';
import { buildAiAnalysis } from '../../ai/general-analyzer.js';

export type ExpectedDirection='POSITIVE'|'NEGATIVE'|'UNRESOLVED';
export interface RevelationSmokeCase { id:string;text:string;expectedAction:string;expectedDirection:ExpectedDirection; }

export const REVELATION_TEN_CASES:RevelationSmokeCase[]=[
  {id:'RC01',text:'Seorang pegawai menerima suap untuk meloloskan izin.',expectedAction:'CORRUPTION',expectedDirection:'NEGATIVE'},
  {id:'RC02',text:'Bendahara menggelapkan dana kantor untuk kepentingan pribadi.',expectedAction:'CORRUPTION',expectedDirection:'NEGATIVE'},
  {id:'RC03',text:'Saya menemukan dompet orang lain lalu mengembalikannya kepada pemilik.',expectedAction:'RESTITUTION',expectedDirection:'POSITIVE'},
  {id:'RC04',text:'Saya sengaja berbohong kepada pelanggan tentang kondisi barang.',expectedAction:'LYING',expectedDirection:'NEGATIVE'},
  {id:'RC05',text:'Seseorang menuduh tetangganya tanpa bukti.',expectedAction:'DEFAMATION',expectedDirection:'NEGATIVE'},
  {id:'RC06',text:'Saya mengecek sumber sebelum membagikan klaim.',expectedAction:'VERIFY_CLAIM',expectedDirection:'POSITIVE'},
  {id:'RC07',text:'Seorang pegawai memakai anggaran publik untuk biaya pribadinya.',expectedAction:'CORRUPTION',expectedDirection:'NEGATIVE'},
  {id:'RC08',text:'Saya rutin merokok setelah bekerja.',expectedAction:'SMOKING',expectedDirection:'UNRESOLVED'},
  {id:'RC09',text:'Seorang siswa membantu temannya belajar tanpa meminta imbalan.',expectedAction:'HELPING_GOOD',expectedDirection:'POSITIVE'},
  {id:'RC10',text:'Ia mengambil barang milik orang lain dan menyimpannya.',expectedAction:'THEFT',expectedDirection:'NEGATIVE'}
];

export async function runRevelationTenCaseSmoke(root=process.cwd()) {
  const provider=createDefaultSemanticProvider(root);
  const rows:any[]=[];
  for(const c of REVELATION_TEN_CASES){
    const obs=await provider.analyze(c.text);
    const result=buildAiAnalysis(c.text,{semanticObservation:obs});
    const sc=result.revelationScorecard;
    const checks={
      action:obs.action===c.expectedAction,
      direction:sc.direction===c.expectedDirection,
      noFinalDivineJudgment:sc.invariants.finalDivineJudgmentComputed===false && result.quranicMizan.divineVerdict===false,
      witnessPolicy:result.fourBookCorroboration.policy.witnessCanCreateMoralDirection===false && result.fourBookCorroboration.policy.witnessCanReverseQuranDirection===false,
      witnessChannels:['TAWRAT','ZABUR','INJIL'].every(book=>['TEXTUAL_WITNESS_MATCH','NO_MATCH'].includes(result.fourBookCorroboration.channels[book].status)),
      noActionVerseTable:obs.legacyBridge?.verseMappingUsed===false,
      nativeBinding:c.id==='RC08' ? obs.revelationBinding?.status==='EMPIRICAL_BRIDGE_REQUIRED' : obs.revelationBinding?.pureNormativeDerivation===true,
      unresolvedSmoking:c.id!=='RC08' || (sc.directionStatus==='UNRESOLVED_WITHOUT_ALLOWED_EMPIRICAL_BRIDGE' && sc.analyticalScore===null && sc.revelationAlignmentScore===null && sc.grounding.empiricalRequired===true)
    };
    rows.push({
      id:c.id,text:c.text,expectedAction:c.expectedAction,action:obs.action,expectedDirection:c.expectedDirection,
      direction:sc.direction,directionStatus:sc.directionStatus,pureRevelationDerived:sc.pureRevelationDerived,
      revelationAlignmentScore:sc.revelationAlignmentScore,analyticalScore:sc.analyticalScore,epistemic:result.quranicMizan.status,witnessBoost:result.fourBookCorroboration.confidenceBoost,witnessBooks:result.fourBookCorroboration.matchedWitnessBooks,nativeRefs:obs.revelationBinding?.references??[],
      checks,ok:Object.values(checks).every(Boolean)
    });
  }
  return {ok:rows.every(r=>r.ok),protocol:'REVELATION_10_CASE_SMOKE_V3',version:'4.29.0',cases:rows,summary:{passed:rows.filter(r=>r.ok).length,total:rows.length,pureRevelationDerived:rows.filter(r=>r.pureRevelationDerived).length}};
}
