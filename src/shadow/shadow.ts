// @ts-nocheck
import crypto from 'node:crypto';
import { createBaseModel } from '../models/base-model.js';

export function createShadowProfile({ shadowId=`SHD_${crypto.randomUUID()}`, name, archetype='REFERENCE', sourceRefs=[], traits=[], description='', createdBy='RID-001' }={}) {
  if (!name) throw new Error('shadow name is required');
  const record=createBaseModel({ id:shadowId, type:'SHADOW.PROFILE', createdBy, data:{name,archetype,sourceRefs,traits,description}, visibility:'PRIVATE' });
  return { ...record, shadowId, name, archetype, sourceRefs, traits, description };
}

export function createPersonalScenario({ scenarioId=`SCN_${crypto.randomUUID()}`, operatorRid, shadowId=null, missionId=null, worldState='PERSONAL', jurisdiction='ID', mode='REAL', objectives=[], createdBy=operatorRid }={}) {
  if (!operatorRid) throw new Error('operatorRid is required');
  if (mode !== 'REAL') throw new Error('Only REAL mode is supported in Personal OS');
  const record=createBaseModel({ id:scenarioId, type:'PERSONAL_SCENARIO', createdBy, data:{operatorRid,shadowId,missionId,worldState,jurisdiction,objectives}, visibility:'PRIVATE' });
  return { ...record, scenarioId, operatorRid, shadowId, missionId, worldState, jurisdiction, mode:'REAL', objectives, status:'DRAFT' };
}

export function scenarioRelations({ scenario, shadowId=null, missionId=null, projectIds=[] }={}) {
  const scenarioId=scenario.id ?? scenario.scenarioId;
  const relations=[];
  if (shadowId) relations.push({from:scenarioId,type:'USES_SHADOW',to:shadowId});
  if (missionId) relations.push({from:scenarioId,type:'HAS_MISSION',to:missionId});
  for (const projectId of projectIds) relations.push({from:scenarioId,type:'CONTAINS_PROJECT',to:projectId});
  return relations;
}
