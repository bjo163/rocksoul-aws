import { loadQuranCorpus } from './quran-corpus.js';
import { revelationMoralGraph } from './moral-graph/revelation-moral-graph.js';
import { assessQuranPassageDirections } from './quran-passage-direction.js';
import { deriveRevelationMagnitudeSignals } from './scoring/revelation-magnitude.js';
import { runtimeDatasetOr } from '@moonwitness/persistence';

type Loose = Record<string, any>;
type RevelationDirection = 'POSITIVE'|'NEGATIVE'|'MIXED'|'UNRESOLVED';

const clamp01=(n:unknown)=>{const v=Number(n??0);return Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;};
const uniq=(xs:unknown[])=>[...new Set(xs.map(String).filter(Boolean))];

function coverageWeight(coverage:string):number {
  if(coverage==='DIRECT') return 1;
  if(coverage==='MIXED') return 0.75;
  if(coverage==='INDIRECT') return 0.35;
  return 0;
}

export function revelationAnalyticalScorecard(input:{observed?:Loose;mizan?:Loose|null;quranicMizan?:Loose|null;fourBook?:Loose|null;binding?:Loose|null;root?:string}={}):Loose {
  const observed=input.observed??{};
  const root=input.root??process.cwd();
  const grounding=observed.quranGrounding??{};
  const coverage=String(grounding.coverage??'NONE').toUpperCase();
  const refs=uniq([...(grounding.direct??[]),...(grounding.principles??[])]);
  const empiricalRequired=Boolean(grounding.empiricalRequired);
  const quran:Map<string,ReturnType<typeof loadQuranCorpus>[number]>=new Map(loadQuranCorpus(root).map(x=>[`Q${x.reference}`,x]));
  const verifiedRefs=refs.filter(r=>quran.has(r));
  const missingRefs=refs.filter(r=>!quran.has(r));
  const moralGraph=revelationMoralGraph(root);
  const graphEdges=(moralGraph.edges??[]).filter((e:Loose)=>verifiedRefs.includes(String(e.reference)));
  const passageDirections=assessQuranPassageDirections(verifiedRefs,root);
  const graphPerspectives=uniq(graphEdges.map((e:Loose)=>e.perspective));
  const explicitPositive=graphPerspectives.includes('GREEN') || graphPerspectives.includes('LIGHT');
  const explicitNegative=graphPerspectives.includes('RED');
  const graphDirection:RevelationDirection = explicitPositive && explicitNegative ? 'MIXED' : explicitPositive ? 'POSITIVE' : explicitNegative ? 'NEGATIVE' : 'UNRESOLVED';
  const semanticRegistry=runtimeDatasetOr('data/semantic/registry.json',{vectors:{impact:{length:13,axes:[]}}}) as Loose;
  const revelationSignals=deriveRevelationMagnitudeSignals({binding:(input.binding??observed.revelationBinding??null) as any,semanticRegistry,root});
  const nativeBinding=input.binding??observed.revelationBinding??null;
  const corroborationBoost=clamp01(input.fourBook?.confidenceBoost ?? 0);
  const refIntegrity=refs.length ? verifiedRefs.length/refs.length : 0;
  const groundingStrength=coverageWeight(coverage)*refIntegrity;
  const groundingConfidence=Math.min(1,groundingStrength + corroborationBoost);

  let direction:RevelationDirection='UNRESOLVED';
  let directionStatus='UNRESOLVED';
  let pureRevelationDerived=false;
  let reason='No sufficient scripture-grounded moral direction was established.';

  if(empiricalRequired){
    direction='UNRESOLVED';
    directionStatus='UNRESOLVED_WITHOUT_ALLOWED_EMPIRICAL_BRIDGE';
    reason='The Revelation binding is indirect and explicitly requires an empirical bridge. The four-revelation-only core does not invent that missing factual evidence.';
  } else if(nativeBinding?.pureNormativeDerivation===true && ['POSITIVE','NEGATIVE','MIXED'].includes(String(nativeBinding?.direction))) {
    direction=String(nativeBinding.direction) as RevelationDirection;
    directionStatus=String(nativeBinding?.protocol)==='REVELATION_EVENT_GRAPH_BINDING_V1' ? 'REVELATION_EVENT_GRAPH_BINDING' : 'REVELATION_NATIVE_BINDING';
    pureRevelationDerived=true;
    reason=directionStatus==='REVELATION_EVENT_GRAPH_BINDING'
      ? 'Moral direction was synthesized from multiple scripture-grounded event nodes. The event parser supplied event structure only and had no normative authority.'
      : 'Action-to-passage references and moral direction were discovered from the bundled Revelation corpus. The language adapter only formed a non-normative query and contained no verse mapping or moral direction.';
  } else if(graphDirection!=='UNRESOLVED') {
    direction=graphDirection;
    directionStatus='SCRIPTURE_EXPLICIT_RELATION';
    pureRevelationDerived=true;
    reason='Direction is supported by explicit Revelation Moral Graph relation(s) on a verified Quran reference.';
  }

  const signed = direction==='POSITIVE' ? 1 : direction==='NEGATIVE' ? -1 : 0;
  const nativeConfidence=clamp01(nativeBinding?.confidence ?? 0);
  const revelationAlignmentConfidence=Math.min(1,pureRevelationDerived ? Math.max(0.05,nativeConfidence || groundingConfidence)+corroborationBoost : groundingConfidence);
  const revelationAlignmentScore = direction==='UNRESOLVED' || direction==='MIXED' ? null : Math.round(signed*100*revelationAlignmentConfidence);
  const analyticalMagnitude=clamp01(revelationSignals.magnitude);
  const analyticalScore = direction==='UNRESOLVED' || direction==='MIXED' ? null : Math.round(signed*100*analyticalMagnitude);

  return {
    protocol:'REVELATION_ANALYTICAL_SCORECARD_V4', version:'4.29.0',
    direction, directionStatus, pureRevelationDerived,
    revelationAlignmentScore,
    revelationAlignmentConfidence:Number(revelationAlignmentConfidence.toFixed(4)),
    analyticalScore,
    scoreBoundary:'revelationAlignmentScore measures confidence in retrieved Revelation direction. analyticalScore uses a software formula whose magnitude inputs come from retrieved Revelation structure (directive strength, explicit relations, repetition, coverage and binding confidence). Neither number is a revealed reward/sin quantity or divine weighing.',
    scoreComposition:{directionSource:directionStatus,revelationAlignmentMagnitude:'REVELATION_BINDING_CONFIDENCE',analyticalMagnitudeSource:'REVELATION_GROUNDED_STRUCTURAL_FEATURES_WITH_ENGINEERING_FORMULA',corroborationRole:'CONFIDENCE_ONLY',pureRevelationDirection:pureRevelationDerived,revelationGroundedMagnitudeInputs:revelationSignals.pureRevelationInputs,pureRevelationAlignmentScore:pureRevelationDerived,pureAnalyticalScore:false},
    grounding:{coverage,groundingStrength:Number(groundingStrength.toFixed(4)),groundingConfidence:Number(groundingConfidence.toFixed(4)),refs,verifiedRefs,missingRefs,empiricalRequired},
    explicitGraph:{matchedEdges:graphEdges,derivedDirection:graphDirection},
    passageDirection:passageDirections,
    corroboration:{confidenceBoost:corroborationBoost,matchedWitnessBooks:Number(input.fourBook?.matchedWitnessBooks??0),role:'CONFIDENCE_ONLY'},
    nativeBinding:nativeBinding?{status:nativeBinding.status,concept:nativeBinding.concept,references:nativeBinding.references,direction:nativeBinding.direction,confidence:nativeBinding.confidence,languageBridge:nativeBinding.languageBridge}:null,
    eventGraph:observed.eventInterpretation?{state:observed.eventInterpretation.state,lifecycle:observed.eventInterpretation.lifecycle??null,conflictCount:Array.isArray(observed.eventInterpretation.conflicts)?observed.eventInterpretation.conflicts.length:0,eventCount:Array.isArray(observed.eventInterpretation.events)?observed.eventInterpretation.events.length:0,conflictResolution:observed.eventInterpretation.conflictResolution??null,normativeAuthority:false}:null,
    moralLifecycle:observed.moralLifecycle?{trajectory:observed.moralLifecycle.trajectory,historicalViolation:observed.moralLifecycle.historicalViolation,activeViolation:observed.moralLifecycle.activeViolation,relapse:observed.moralLifecycle.relapse,restoration:observed.moralLifecycle.restoration,grounding:observed.moralLifecycle.grounding,normativeAuthority:false}:null,
    revelationMagnitude:revelationSignals,
    legacyBridge:{normativeAuthority:false,usedForDirection:false,usedForMagnitude:false,role:'LANGUAGE_COMPATIBILITY_ONLY'},
    epistemicStatus:input.quranicMizan?.status ?? 'UNKNOWN',
    reason,
    invariants:{
      quranPrimary:true,
      witnessMayCreateDirection:false,
      witnessMayReverseQuran:false,
      empiricalFactsMayBeInvented:false,
      legacyActionScoreIsRevelationScore:false,
      legacyActionMagnitudeUsed:false,
      finalDivineJudgmentComputed:false
    }
  };
}
