// @ts-nocheck
export function verificationRelations({ cabId, verificationCaseId, evidenceIds = [], sourceRefs = [], knowledgeDraftId = null, publicationId = null }) {
  const relations = [];
  if (verificationCaseId) relations.push({ from: cabId, type: 'VERIFIES', to: verificationCaseId });
  for (const id of evidenceIds) relations.push({ from: verificationCaseId ?? cabId, type: 'BASED_ON', to: id });
  for (const id of sourceRefs) relations.push({ from: verificationCaseId ?? cabId, type: 'MATCHES_SOURCE', to: id });
  if (knowledgeDraftId) relations.push({ from: verificationCaseId ?? cabId, type: 'GENERATES_KNOWLEDGE', to: knowledgeDraftId });
  if (publicationId) relations.push({ from: knowledgeDraftId ?? verificationCaseId ?? cabId, type: 'PUBLISHES_AS', to: publicationId });
  return relations;
}
