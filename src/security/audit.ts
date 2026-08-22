// @ts-nocheck
import {createHash} from 'node:crypto';
export function auditEvent({actorId=null,action,resource,decision,metadata={}}){
  const payload={actorId,action,resource,decision,metadata,at:new Date().toISOString()};
  return {...payload,eventHash:createHash('sha256').update(JSON.stringify(payload)).digest('hex')};
}
