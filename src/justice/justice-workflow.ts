// @ts-nocheck
import crypto from 'node:crypto';
const id=p=>`${p}_${crypto.randomUUID()}`;
export function createCase({jurisdiction='UNSPECIFIED',reporter='ANONYMOUS',allegation='' }={}){return {caseId:id('CASE'),jurisdiction,reporter,allegation,status:'REPORTED',events:[],parties:{suspect:null,victims:[],witnesses:[]},evidence:[],charges:[],verdict:null,sentence:null};}
export function addEvidence(c,e){c.evidence.push({...e,evidenceId:e.evidenceId??id('EVID'),hash:crypto.createHash('sha256').update(JSON.stringify(e)).digest('hex')});return c;}
export function policeReview(c){c.events.push({role:'POLICE',action:'INVESTIGATION_OPENED',at:new Date().toISOString()});c.status='UNDER_INVESTIGATION';return c;}
export function prosecutorReview(c,{charge='' }={}){if(c.status!=='UNDER_INVESTIGATION')throw new Error('Case must be under investigation'); if(charge)c.charges.push(charge);c.events.push({role:'PROSECUTOR',action:'CHARGE_REVIEWED',at:new Date().toISOString()});c.status='PROSECUTION';return c;}
export function defenseReview(c){c.events.push({role:'DEFENSE',action:'DEFENSE_REVIEWED',at:new Date().toISOString()});return c;}
export function courtVerdict(c,{verdict='UNRESOLVED',findings=[]}={}){c.verdict={verdict,findings,at:new Date().toISOString()};c.status='ADJUDICATED';return c;}
export function sentence(c,{type='NO_SENTENCE',duration=null,restitution=0,notes=[]}={}){if(c.verdict?.verdict!=='GUILTY') throw new Error('Sentence requires GUILTY model verdict');c.sentence={type,duration,restitution,notes};c.status='SENTENCED';return c;}
export function appeal(c,{ground='LEGAL_ERROR'}={}){c.events.push({role:'APPEAL',action:'APPEAL_FILED',ground,at:new Date().toISOString()});c.status='APPEAL_PENDING';return c;}
