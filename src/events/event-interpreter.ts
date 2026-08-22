import { bindActionToRevelation } from '../revelation/binding/native-revelation-binder.js';
import { deriveRevelationMagnitudeSignals } from '../revelation/scoring/revelation-magnitude.js';
import type { RevelationNativeBinding } from '../revelation/binding/types.js';
import type { SemanticEventGraph,SemanticEventNode } from './types.js';
import { resolveEventConflicts } from './conflict-resolution.js';

type Loose=Record<string,any>;
const clamp=(n:number)=>Math.max(-1,Math.min(1,n));
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
const uniq=<T>(xs:T[])=>[...new Set(xs)];
export interface InterpretedEvent {eventId:string;sequence:number;occurrence:string;action:string;binding:RevelationNativeBinding;signals:Loose;context:SemanticEventNode['context'];restoration:boolean;responsibilityFactor:number;}

function responsibility(node:SemanticEventNode):number{
  if(node.occurrence==='NEGATED'||node.occurrence==='CONTEXT_INVALIDATED')return 0;
  let f=1; if(node.context.coercion)f*=.55; if(node.context.mistake)f*=.60; if(node.context.capacityLimited)f*=.75; if(node.occurrence==='REPORTED')f*=.85; return Number(f.toFixed(4));
}
function activeActions(node:SemanticEventNode){return node.actions.filter(a=>!a.suppressed);}

export function interpretSemanticEventGraph(input:{graph:SemanticEventGraph;semanticRegistry?:Loose;root?:string}){
  const root=input.root??process.cwd(); const interpreted:InterpretedEvent[]=[];
  for(const node of input.graph.nodes){
    if(['NEGATED','CONTEXT_INVALIDATED','UNRESOLVED'].includes(node.occurrence))continue;
    for(const action of activeActions(node)){
      const binding=bindActionToRevelation({action:action.action,text:node.text,root});
      const signals=deriveRevelationMagnitudeSignals({binding,semanticRegistry:input.semanticRegistry??{},root});
      interpreted.push({eventId:node.id,sequence:node.sequence,occurrence:node.occurrence,action:action.action,binding,signals,context:node.context,restoration:node.restoration||action.action==='RESTITUTION',responsibilityFactor:responsibility(node)});
    }
  }
  const resolved=interpreted.filter(x=>x.binding.pureNormativeDerivation===true&&['POSITIVE','NEGATIVE'].includes(x.binding.direction));
  const negatives=resolved.filter(x=>x.binding.direction==='NEGATIVE'); const positives=resolved.filter(x=>x.binding.direction==='POSITIVE');
  const restoration=positives.filter(x=>x.restoration);
  const conflictResolution=resolveEventConflicts(interpreted);
  const sameEventConflict=conflictResolution.state==='ACTUAL_CONFLICT';
  const historicalViolation=negatives.length>0; const laterRestoration=restoration.some(r=>negatives.some(n=>r.sequence>n.sequence));
  let state='UNRESOLVED';
  if(sameEventConflict)state='PRINCIPLE_CONFLICT'; else if(historicalViolation&&laterRestoration)state='VIOLATION_WITH_RESTORATION'; else if(negatives.length&&positives.length)state='MIXED_SEQUENCE'; else if(negatives.length)state='NEGATIVE'; else if(positives.length)state='POSITIVE';
  const maxNeg=negatives.length?Math.max(...negatives.map(x=>Number(x.signals.magnitude??0)*x.responsibilityFactor)):0;
  const maxPos=positives.length?Math.max(...positives.map(x=>Number(x.signals.magnitude??0))):0;
  const blue=resolved.length?resolved.reduce((s,x)=>s+Number(x.signals.rgbl?.B??0),0)/resolved.length:0;
  const light=restoration.length?Math.max(...restoration.map(x=>Number(x.signals.magnitude??0))):0;
  const axesLength=Number(input.semanticRegistry?.vectors?.impact?.length??13); const impactVector:number[]=[];
  for(let i=0;i<axesLength;i++){
    const vals=resolved.map(x=>Number(x.signals.impactVector?.[i]??0)*(x.binding.direction==='NEGATIVE'?x.responsibilityFactor:1)); const neg=vals.filter(v=>v<0),pos=vals.filter(v=>v>0);
    impactVector.push(neg.length?Math.min(...neg):pos.length?Math.max(...pos):0);
  }
  const refs=uniq(resolved.flatMap(x=>x.binding.references??[])); const passages=resolved.flatMap(x=>x.binding.passages??[]);
  const direction=negatives.length&&positives.length?'MIXED':negatives.length?'NEGATIVE':positives.length?'POSITIVE':'UNRESOLVED';
  const confidence=resolved.length?clamp01(resolved.reduce((s,x)=>s+Number(x.binding.confidence??0),0)/resolved.length):0;
  const syntheticBinding:RevelationNativeBinding={protocol:'REVELATION_EVENT_GRAPH_BINDING_V1',version:'4.29.0',action:interpreted.length===1?interpreted[0].action:'COMPOSITE_EVENT',concept:'EVENT_GRAPH',coverage:resolved.length?'MIXED':'NONE',empiricalRequired:interpreted.some(x=>x.binding.empiricalRequired),references:refs,direct:refs,principles:[],direction:direction as any,confidence,status:`EVENT_GRAPH_${state}`,pureNormativeDerivation:resolved.length>0&&resolved.length===interpreted.filter(x=>!x.binding.empiricalRequired).length,languageBridge:{used:true,normativeAuthority:false,profile:'EVENT_GRAPH'},passages,witnessQueryPhrases:uniq(resolved.flatMap(x=>x.binding.witnessQueryPhrases??[])),boundary:'Aggregate binding preserves all occurred events. Opposing directions are not arithmetically cancelled; event-level bindings remain available for audit.'};
  const aggregateBinding:RevelationNativeBinding = interpreted.length===1 ? interpreted[0].binding : syntheticBinding;
  const compositeSignals={protocol:'REVELATION_EVENT_COMPOSITE_SIGNALS_V1',version:'4.29.0',direction,magnitude:Math.max(maxNeg,maxPos),rgbl:{R:maxNeg?-clamp01(maxNeg):0,G:clamp01(maxPos),B:clamp01(blue),L:clamp01(light)},impactVector:impactVector.map(clamp),impactAxes:[],features:{eventCount:interpreted.length,resolvedEventCount:resolved.length,negativeEvents:negatives.length,positiveEvents:positives.length,restorationEvents:restoration.length},references:refs,pureRevelationInputs:resolved.length>0,boundary:'Composite magnitude preserves separate violation, benefit, epistemic and restoration channels. Opposing event directions are not netted into a revealed quantity.'};
  const conflicts:Loose[]=[];
  if(sameEventConflict)conflicts.push({id:'EVENT_PRINCIPLE_CONFLICT',type:'REVELATION_PRINCIPLE',status:'ACTUAL_CONFLICT',severity:.85,sides:resolved.filter(x=>resolved.some(y=>y.eventId===x.eventId&&y.binding.direction!==x.binding.direction)).map(x=>({eventId:x.eventId,action:x.action,direction:x.binding.direction,refs:x.binding.references}))});
  if(historicalViolation&&laterRestoration)conflicts.push({id:'EVENT_RESTORATION_TENSION',type:'MORAL_LIFECYCLE',status:'RESOLVED_SEQUENCE',severity:.5,sides:[{historical:'VIOLATION'},{later:'RESTORATION'}]});
  const violationResponsibilityFactor=negatives.length?Number((negatives.reduce((s,x)=>s+x.responsibilityFactor,0)/negatives.length).toFixed(4)):1;
  return {protocol:'REVELATION_EVENT_INTERPRETER_V1',version:'4.30.0',state,direction,events:interpreted,conflicts,conflictResolution,lifecycle:{historicalViolation,laterRestoration,currentState:laterRestoration?'RESTORING':state==='NEGATIVE'?'VIOLATION_ACTIVE':state==='POSITIVE'?'CONSTRUCTIVE':'UNRESOLVED'},composite:{rgbl:compositeSignals.rgbl,impactVector:compositeSignals.impactVector,confidence,violationResponsibilityFactor,revelationSignals:compositeSignals},binding:aggregateBinding,boundary:'Event interpretation keeps violation, benefit, uncertainty and restoration as separate channels. Restoration does not erase a historical violation, and conflicting principles produce an explicit conflict state instead of a forced net verdict.'};
}
