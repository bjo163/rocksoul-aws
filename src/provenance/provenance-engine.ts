// @ts-nocheck
import crypto from 'node:crypto';
export function createProvenance({sourceType,sourceId,reference=null,author=null,date=null,version=null,authority='UNKNOWN',confidence=0,interpretation=null}={}){
  return {provenanceId:`PROV_${crypto.randomUUID()}`,sourceType,sourceId,reference,author,date,version,authority,confidence,interpretation,createdAt:new Date().toISOString()};
}
export function attachProvenance(record, provenance){return {...record, provenance:Array.isArray(provenance)?provenance:[provenance]};}
