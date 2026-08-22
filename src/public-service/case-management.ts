// @ts-nocheck
export const CASE_STATES=['OPEN','UNDER_REVIEW','IN_PROGRESS','PENDING_DECISION','RESOLVED','CLOSED'];
export function createCase({caseId, rid, domain, title, legalBasis=[], evidenceIds=[]}) { return {caseId, rid, domain, title, legalBasis, evidenceIds, state:'OPEN', createdAt:new Date().toISOString(), history:[]}; }
export function transitionCase(c,next,note=''){ if(!CASE_STATES.includes(next)) throw new Error('INVALID_CASE_STATE'); return {...c,state:next,history:[...c.history,{from:c.state,to:next,note,at:new Date().toISOString()}]}; }
