import { runtimeDatasetOr } from '../persistence/runtime-data.js';
import { scriptureSourcePolicy, scriptureCorpusStatus } from './scripture-source-policy.js';
import { revelationGeographyReport } from './revelation-geography.js';
import { asmaEngineSnapshot } from './asma/asma-engine.js';
import { revelationMoralGraph } from './moral-graph/revelation-moral-graph.js';
import { fourBookCorpusSnapshot } from './corpus/four-book-corpus.js';
import { revelationBindingEngineSnapshot } from './binding/native-revelation-binder.js';
import { semanticEventEngineSnapshot } from '../events/event-parser.js';
import { revelationLifecycleSnapshot } from './lifecycle/revelation-lifecycle.js';
import { revelationGrammarSnapshot } from './grammar/revelation-grammar.js';
import { divineOntologySnapshot } from './asma/divine-ontology.js';
import { propheticRelationsSnapshot } from './prophetic-relations.js';

export function revelationResearchObjects() {
  return {
    hypotheses: runtimeDatasetOr('data/revelation/geography-hypotheses.json', { version:'unknown', status:'RESEARCH_ONLY', hypotheses:[] }),
    scriptureMap: runtimeDatasetOr('data/revelation/scripture-research-map.json', { version:'unknown', status:'RESEARCH_ONLY_NOT_NORMATIVE_WEIGHT' })
  };
}

export function revelationSemanticCoreSnapshot(root=process.cwd()) {
  return {
    protocol:'REVELATION_SEMANTIC_CORE_V2',
    version:'4.32.0',
    sourcePolicy:scriptureSourcePolicy(),
    corpusStatus:scriptureCorpusStatus(),
    geography:revelationGeographyReport(root),
    asma:asmaEngineSnapshot(root),
    divineOntology:divineOntologySnapshot(root),
    propheticRelations:propheticRelationsSnapshot(),
    moralGraph:revelationMoralGraph(root),
    fourBookCorpora:fourBookCorpusSnapshot(root),
    nativeBinding:revelationBindingEngineSnapshot(root),
    eventInterpreter:semanticEventEngineSnapshot(),
    moralLifecycle:revelationLifecycleSnapshot(root),
    grammar:revelationGrammarSnapshot(root),
    research:revelationResearchObjects(),
    boundaries:{
      fourBooksOnly:true,
      quranPrimaryMuhaimin:true,
      externalNormativeWeight:0,
      unavailableCorpusMayBeInvented:false,
      revelationLocationMayBeInferredFromPlaceMention:false,
      textualWitnessIsOriginalRevelation:false,
      researchHypothesisMayBecomeNormativeRuleAutomatically:false,
      canonical99IsSourceOfTruth:false,
      asmaMustBeDiscoveredFromRevelation:true,
      actionSpecificMoralScoreMayBeHardcoded:false,
      textualWitnessMayOutvoteQuran:false,
      witnessIndexWithoutTextMayContributeScore:false,
      actionToVerseTableAllowed:false,
      languageAdapterHasNormativeAuthority:false,
      eventInterpreterHasNormativeAuthority:false,
      lifecycleLanguageProfileHasNormativeAuthority:false,
      repentanceDeclarationMayEqualDivineAcceptance:false,
      forgivenessRequestMayEqualDivineForgiveness:false,
      restorationMayEraseHistoricalViolation:false,
      grammarHasNormativeAuthority:false,
      grammarMayClaimCanonicalRootWithoutProof:false,
      textualWitnessGrammarMayOutvoteQuran:false,
      divineOntologyMayPromoteCanonicalNameAutomatically:false,
      ontologyClusteringMayCreateNormativeAuthority:false,
      propheticRelationsDoNotInferHistoricalChronology:true,
      propheticRelationsDoNotCreateDivineAuthority:true,
      unresolvedPropheticRelationsRemainUnresolved:true
    }
  };
}
