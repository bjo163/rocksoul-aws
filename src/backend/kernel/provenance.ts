import crypto from 'node:crypto';
export function createProvenance({sourceType='SYSTEM', sourceId=null, reference=null, authority='UNKNOWN', confidence=0.5, interpreted=false, recordedBy='BACKEND'} = {}) {
  return {provenanceId:`PROV_${crypto.randomUUID()}`, sourceType, sourceId, reference, authority, confidence, interpreted, recordedBy, recordedAt:new Date().toISOString()};
}
