// @ts-nocheck
export const LIFECYCLE_STATES=Object.freeze(['DRAFT','PROPOSED','REVIEW','APPROVED','ACTIVE','SUSPENDED','DEPRECATED','RETIRED','ARCHIVED']);
export function transition(state,next,{reason=''}={}){if(!LIFECYCLE_STATES.includes(next))throw new Error(`Unknown lifecycle state: ${next}`);return{from:state,to:next,reason,at:new Date().toISOString()};}
export function versionedEntity({id,version=1,effectiveFrom=null,effectiveTo=null,supersedes=null,status='DRAFT',payload={}}){return{id,version,effectiveFrom,effectiveTo,supersedes,status,payload};}
