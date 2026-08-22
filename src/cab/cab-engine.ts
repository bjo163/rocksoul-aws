// @ts-nocheck
import crypto from 'node:crypto';
import { createBaseModel } from '../models/base-model.js';

export const CAB_TYPES = Object.freeze([
  'CHANGE.REQUEST','CHANGE.PROPOSAL','KNOWLEDGE.SHARE','KNOWLEDGE.CLARIFICATION','MEDIA.CLAIM_REVIEW',
  'PROJECT.CHANGE','POLICY.REVIEW','RULE.REVIEW','SCENARIO.REVIEW'
]);
export const CAB_STATUSES = Object.freeze(['DRAFT','SUBMITTED','TRIAGED','REVIEW','REQUEST_MORE_EVIDENCE','APPROVED','REJECTED','DEFERRED','IMPLEMENTING','VERIFIED','CLOSED']);
export const CAB_DECISIONS = Object.freeze(['ACCEPT','REJECT','REQUEST_MORE_EVIDENCE','DEFER']);

export function createCab({ cabId=`CAB_${crypto.randomUUID()}`, title, requesterId, operatorRid=requesterId, missionId=null, heroReferenceId=null, shadowId=operatorRid, type='CHANGE.REQUEST', summary='', status='DRAFT', sourceType='OBSERVATION', visibility='PRIVATE', metadata={}, createdBy=operatorRid }={}) {
  if (!title) throw new Error('CAB title is required');
  if (!operatorRid) throw new Error('operatorRid is required');
  if (!CAB_TYPES.includes(type)) throw new Error(`Unsupported CAB type: ${type}`);
  if (!CAB_STATUSES.includes(status)) throw new Error(`Unsupported CAB status: ${status}`);
  const record = createBaseModel({
    id:cabId, type, createdBy, visibility, metadata,
    data:{ modelType:'CAB.BOARD', title, missionId, shadowId, heroReferenceId, summary, sourceType, cabStatus:status }
  });
  return { ...record, cabId:record.id, requesterId:operatorRid, operatorRid, missionId, shadowId, heroReferenceId, summary, sourceType, status, cabStatus:status };
}

export function createChangeRequest({ cabId, requestedBy, title, description='', affectedTypes=[], affectedEntityIds=[], affectedRuleIds=[], evidenceIds=[], sourceRefs=[], projectIds=[], decision=null, impact={}, risk={}, perspectives={ R:null,G:null,B:null,L:null } }={}) {
  if (!cabId || !requestedBy || !title) throw new Error('cabId, requestedBy and title are required');
  if (decision && !CAB_DECISIONS.includes(decision)) throw new Error(`Unsupported decision: ${decision}`);
  const changeRequestId=`CR_${crypto.randomUUID()}`;
  const record=createBaseModel({
    id:changeRequestId, type:'CHANGE.REQUEST', createdBy:requestedBy,
    data:{ cabId, title, description, affectedTypes, affectedEntityIds, affectedRuleIds, evidenceIds, sourceRefs, projectIds, decision, impact, risk, perspectives },
    status:decision === 'ACCEPT' ? 'APPROVED' : 'SUBMITTED'
  });
  return { ...record, changeRequestId, cabId, requestedBy, title, description, affectedTypes, affectedEntityIds, affectedRuleIds, evidenceIds, sourceRefs, projectIds, decision, impact, risk, perspectives };
}

export function cabRelations({ cabId, changeRequestId, requesterId, operatorRid=null, shadowId=null, heroReferenceId=null, missionId=null, projectIds=[], evidenceIds=[], sourceRefs=[], affectedEntityIds=[], affectedRuleIds=[] }) {
  const relations=[];
  const operator = operatorRid ?? shadowId ?? requesterId;
  if (operator) relations.push({ from:cabId,type:'OPERATED_BY',to:operator });
  if (requesterId) relations.push({ from:cabId,type:'CREATED_BY',to:requesterId });
  if (shadowId) relations.push({ from:cabId,type:'USES_SHADOW',to:shadowId });
  if (heroReferenceId) relations.push({ from:cabId,type:'USES_HERO_REFERENCE',to:heroReferenceId });
  if (missionId) relations.push({ from:cabId,type:'HAS_MISSION',to:missionId });
  if (changeRequestId) relations.push({ from:cabId,type:'CREATES_CHANGE_REQUEST',to:changeRequestId });
  for (const id of projectIds) { relations.push({ from:changeRequestId ?? cabId,type:'IMPLEMENTS_INTO_PROJECT',to:id }); relations.push({ from:cabId,type:'AFFECTS_PROJECT',to:id }); relations.push({ from:cabId,type:'HAS_PROJECT',to:id }); }
  for (const id of evidenceIds) relations.push({ from:cabId,type:'BASED_ON',to:id });
  for (const id of sourceRefs) relations.push({ from:cabId,type:'REFERENCES',to:id });
  for (const id of affectedEntityIds) relations.push({ from:cabId,type:'AFFECTS',to:id });
  for (const id of affectedRuleIds) relations.push({ from:cabId,type:'TARGETS_RULE',to:id });
  return relations;
}

export function knowledgeWorkflow({ cab, changeRequest, contentType='KNOWLEDGE.SHARE', createdBy='SYSTEM-001' }={}) {
  const id=`WF_${crypto.randomUUID()}`;
  const record=createBaseModel({ id, type:'CAB.WORKFLOW', createdBy, data:{ kind:contentType,cabId:cab.cabId ?? cab.id,changeRequestId:changeRequest.changeRequestId ?? changeRequest.id,stages:['DRAFT','SOURCE_CHECK','R_REVIEW','G_REVIEW','B_REVIEW','L_REVIEW','PUBLISH_OR_PRIVATE','FEEDBACK','CLOSE'],currentStage:'DRAFT',clarificationTarget:null,publication:{status:'PRIVATE',channelIds:[]} } });
  return { ...record, workflowId:id, kind:contentType, cabId:record.data.cabId, changeRequestId:record.data.changeRequestId, stages:record.data.stages, currentStage:record.data.currentStage, publication:record.data.publication };
}

export function clarifyClaim({ cabId, claimText, sourceIds=[], targetAudience='PUBLIC', createdBy='SYSTEM-001' }) {
  const id=`CLAR_${crypto.randomUUID()}`;
  const record=createBaseModel({ id, type:'CAB.CLARIFICATION', createdBy, data:{cabId,claimText,sourceIds,targetAudience,result:null}, status:'OPEN' });
  return { ...record, clarificationId:id, cabId, claimText, sourceIds, targetAudience, result:null };
}
