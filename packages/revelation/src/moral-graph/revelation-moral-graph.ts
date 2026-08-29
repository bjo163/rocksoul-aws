import crypto from 'node:crypto';
import { mineExplicitDivineRelations } from '../asma/relation-miner.js';
import { divineOntologySnapshot } from '../asma/divine-ontology.js';
import { normalizedArabic } from '../quran-corpus.js';
import type { DivineRelation, DivineRelationType } from '../asma/types.js';

export type MoralPerspective = 'RED'|'GREEN'|'BLUE'|'LIGHT'|'UNASSIGNED';

const perspectiveByRelation: Record<DivineRelationType,MoralPerspective> = {
  LOVES:'GREEN',
  DOES_NOT_LOVE:'RED',
  COMMANDS:'GREEN',
  DOES_NOT_COMMAND:'RED',
  FORBIDS:'RED',
  FORGIVES:'LIGHT',
  DOES_NOT_FORGIVE:'RED',
  GUIDES:'BLUE',
  DOES_NOT_GUIDE:'RED',
  KNOWS:'BLUE',
  JUDGES:'BLUE'
};

function edgeId(r:DivineRelation):string { return `MREL-${crypto.createHash('sha256').update(r.relationId).digest('hex').slice(0,16)}`; }

export function revelationMoralGraph(root=process.cwd()) {
  const relations=mineExplicitDivineRelations(root);
  const ontology=divineOntologySnapshot(root);
  const familyByRelation=new Map<string,string>();
  const targetConceptByKey=new Map(ontology.relationTargets.map(x=>[`${x.family}|${x.normalizedTarget}`,x.targetConceptId] as const));
  for(const family of ontology.relationFamilies){
    for(const relation of [...family.positiveRelations,...family.negativeRelations,...family.otherRelations]) familyByRelation.set(relation,family.familyId);
  }
  const familyNameById=new Map(ontology.relationFamilies.map(x=>[x.familyId,x.family] as const));
  const edges=relations.map(r=>{
    const relationFamilyId=familyByRelation.get(r.relation)??null;
    const relationFamily=relationFamilyId?familyNameById.get(relationFamilyId)??null:null;
    const normalizedTarget=normalizedArabic(r.targetSurface);
    return ({
    edgeId:edgeId(r),
    source:'ALLAH',
    relation:r.relation,
    relationFamilyId,
    relationTargetConceptId:relationFamily?targetConceptByKey.get(`${relationFamily}|${normalizedTarget}`)??null:null,
    targetSurface:r.targetSurface,
    perspective:perspectiveByRelation[r.relation],
    authority:'SCRIPTURE_EXPLICIT',
    reference:r.reference,
    grounding:r.grounding,
    predicateSurface:r.predicateSurface
  });});
  const counts=edges.reduce<Record<string,number>>((acc,e)=>{acc[e.perspective]=(acc[e.perspective]??0)+1;return acc;},{});
  return {
    protocol:'REVELATION_MORAL_GRAPH_V2',
    version:'4.30.0',
    ontologyProtocol:ontology.protocol,
    ontologyRelationFamilies:ontology.relationFamilies.map(x=>({familyId:x.familyId,family:x.family,polarityContrastObserved:x.polarityContrastObserved,references:x.references.length})),
    edges,
    countsByPerspective:counts,
    invariants:{
      actionSpecificMoralScoreHardcoded:false,
      perspectiveAssignmentIsEngineeringInterpretation:true,
      scripturalRelationRemainsPrimaryEvidence:true,
      ontologyClusterMayCreateMoralAuthority:false,
      ontologyFamilyMayOverrideExplicitRelation:false,
      finalDivineJudgmentComputed:false
    },
    boundary:'RGBL assignment is an engineering lens over explicit Revelation relations. The Divine ontology organizes relation families and corpus context, but ontology clustering cannot create or override moral authority.'
  };
}
