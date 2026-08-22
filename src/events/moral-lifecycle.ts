import type { SemanticEventGraph } from './types.js';
import { groundRevelationLifecycleStage } from '../revelation/lifecycle/revelation-lifecycle.js';

type Loose=Record<string,any>;
const uniq=<T>(xs:T[])=>[...new Set(xs)];
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));

export type MoralLifecycleTrajectory=
  'UNRESOLVED'|'CONSTRUCTIVE'|'VIOLATION_ACTIVE'|'VIOLATION_ACKNOWLEDGED'|'RETURN_DECLARED'|'CESSATION_REPORTED'|'RESTITUTION_IN_PROGRESS'|'REPAIRING'|'RESTORATIVE_TRAJECTORY'|'RELAPSE';

export interface MoralLifecycleStageEvent {
  eventId:string;
  sequence:number;
  stage:string;
  signals:string[];
  grounding:Loose;
  confidence:number;
}

function stagesFromGraph(graph:SemanticEventGraph,root:string):MoralLifecycleStageEvent[]{
  const out:MoralLifecycleStageEvent[]=[];
  for(const node of graph.nodes){
    for(const [stage,signals] of Object.entries(node.lifecycleSignals??{})){
      const groundingStage=stage==='FORGIVENESS_REQUEST'?'FORGIVENESS_LANGUAGE':stage;
      const grounding=groundRevelationLifecycleStage(groundingStage,root);
      out.push({eventId:node.id,sequence:node.sequence,stage,signals:Array.isArray(signals)?signals:[],grounding,confidence:Number((node.confidence*(grounding.confidence||.55)).toFixed(4))});
    }
    if(node.restoration && !out.some(x=>x.eventId===node.id&&x.stage==='RESTITUTION')){
      const grounding=groundRevelationLifecycleStage('RESTITUTION',root);
      out.push({eventId:node.id,sequence:node.sequence,stage:'RESTITUTION',signals:['EVENT_RESTITUTION'],grounding,confidence:Number((node.confidence*(grounding.confidence||.55)).toFixed(4))});
    }
  }
  return out.sort((a,b)=>a.sequence-b.sequence||a.stage.localeCompare(b.stage));
}

export function buildMoralLifecycle(input:{graph:SemanticEventGraph;eventInterpretation:Loose;root?:string}){
  const root=input.root??process.cwd();
  const stages=stagesFromGraph(input.graph,root);
  const interpreted=Array.isArray(input.eventInterpretation?.events)?input.eventInterpretation.events:[];
  const violations=interpreted.filter((e:Loose)=>e.binding?.direction==='NEGATIVE'&&e.binding?.pureNormativeDerivation===true);
  const constructive=interpreted.filter((e:Loose)=>e.binding?.direction==='POSITIVE'&&e.binding?.pureNormativeDerivation===true);
  const violationSeq=violations.map((x:Loose)=>Number(x.sequence??0));
  const lastViolation=Math.max(0,...violationSeq);
  const restorativeStages=new Set(['AWARENESS','REGRET','CESSATION','RETURN_REPENTANCE','RESTITUTION','REPAIR','RECONCILIATION','FORGIVENESS_REQUEST']);
  const restorative=stages.filter(x=>restorativeStages.has(x.stage));
  const lastRestorative=Math.max(0,...restorative.map(x=>x.sequence));
  const cessation=stages.some(x=>x.stage==='CESSATION'&&x.sequence>=lastViolation);
  const repentance=stages.some(x=>x.stage==='RETURN_REPENTANCE'&&x.sequence>=lastViolation);
  const restitution=stages.some(x=>x.stage==='RESTITUTION'&&x.sequence>=lastViolation);
  const repair=stages.some(x=>x.stage==='REPAIR'&&x.sequence>=lastViolation);
  const reconciliation=stages.some(x=>x.stage==='RECONCILIATION'&&x.sequence>=lastViolation);
  const awareness=stages.some(x=>x.stage==='AWARENESS'&&x.sequence>=lastViolation);
  const regret=stages.some(x=>x.stage==='REGRET'&&x.sequence>=lastViolation);
  const persistence=stages.some(x=>x.stage==='PERSISTENCE'&&x.sequence>=lastViolation);
  const explicitRelapse=stages.some(x=>x.stage==='RELAPSE');
  const relapseBySequence=lastRestorative>0 && violationSeq.some(seq=>seq>lastRestorative);
  const relapse=explicitRelapse||relapseBySequence;
  const historicalViolation=violations.length>0;
  const activeViolation=historicalViolation && (relapse || (!cessation&&!repentance&&!restitution&&!repair));

  let trajectory:MoralLifecycleTrajectory='UNRESOLVED';
  if(relapse) trajectory='RELAPSE';
  else if(historicalViolation&&repair&&restitution&&(cessation||repentance)) trajectory='RESTORATIVE_TRAJECTORY';
  else if(historicalViolation&&repair) trajectory='REPAIRING';
  else if(historicalViolation&&restitution) trajectory='RESTITUTION_IN_PROGRESS';
  else if(historicalViolation&&cessation) trajectory='CESSATION_REPORTED';
  else if(historicalViolation&&repentance) trajectory='RETURN_DECLARED';
  else if(historicalViolation&&(awareness||regret)) trajectory='VIOLATION_ACKNOWLEDGED';
  else if(historicalViolation) trajectory='VIOLATION_ACTIVE';
  else if(constructive.length) trajectory='CONSTRUCTIVE';

  const progression=['AWARENESS','REGRET','CESSATION','RETURN_REPENTANCE','RESTITUTION','REPAIR','RECONCILIATION'];
  const attained=progression.filter(stage=>stages.some(x=>x.stage===stage));
  const restorationSignal=historicalViolation?clamp01(attained.length/progression.length):0;
  const quranRefs=uniq(stages.flatMap(x=>x.grounding?.quranRefs??[]));
  const witnessBooks=uniq(stages.flatMap(x=>Object.entries(x.grounding?.corroboration?.channels??{}).filter(([,v]:any)=>v?.status==='TEXTUAL_WITNESS_MATCH').map(([book])=>book)));
  const stageConfidence=stages.length?stages.reduce((a,x)=>a+x.confidence,0)/stages.length:0;

  return {
    protocol:'REVELATION_MORAL_LIFECYCLE_V1',version:'4.29.0',trajectory,
    historicalViolation,activeViolation,relapse,
    states:{awareness,regret,cessation,repentanceDeclared:repentance,restitution,repair,reconciliation,persistence,forgivenessRequested:stages.some(x=>x.stage==='FORGIVENESS_REQUEST')},
    stages,
    timeline:stages.map(x=>({eventId:x.eventId,sequence:x.sequence,stage:x.stage,signals:x.signals,quranRefs:x.grounding?.quranRefs??[],confidence:x.confidence})),
    current:{lastViolationSequence:lastViolation||null,lastRestorativeSequence:lastRestorative||null,trajectory},
    restoration:{signal:Number(restorationSignal.toFixed(4)),attainedStages:attained,historyErased:false,divineForgivenessAccepted:null,divineRepentanceAccepted:null,humanReconciliationObserved:reconciliation},
    grounding:{quranRefs,witnessBooks,confidence:Number(clamp01(stageConfidence).toFixed(4)),quranPrimaryMuhaimin:true,witnessConfidenceOnly:true},
    invariants:{historicalViolationErasedByRestoration:false,repentanceDeclarationEqualsDivineAcceptance:false,forgivenessRequestEqualsDivineForgiveness:false,finalDivineJudgmentComputed:false,normativeAuthorityOfLanguageProfile:false},
    boundary:'Moral lifecycle tracks reported/observed change over time. It never computes whether repentance or forgiveness was accepted by Allah, and restorative stages never erase the historical violation record.'
  };
}
