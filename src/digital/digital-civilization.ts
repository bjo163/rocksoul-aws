// @ts-nocheck
import { randomUUID, createHash } from 'node:crypto';
export const DIGITAL_TYPES = Object.freeze({
  INTERNET_DOMAIN:'INTERNET.DOMAIN', INTERNET_NETWORK:'INTERNET.NETWORK', TELECOM_NETWORK:'TELECOM.NETWORK',
  DATA_RECORD:'DATA.RECORD', CLOUD_SERVICE:'CLOUD.SERVICE', SOFTWARE_SERVICE:'SOFTWARE.SERVICE',
  AI_MODEL:'AI.MODEL', AI_OUTPUT:'AI.OUTPUT', MEDIA_CONTENT:'MEDIA.CONTENT', MEDIA_CLAIM:'MEDIA.CLAIM',
  CYBER_INCIDENT:'CYBER.INCIDENT', CYBER_ASSET:'CYBER.ASSET', DIGITAL_IDENTITY:'DIGITAL.IDENTITY',
  DIGITAL_ACCOUNT:'DIGITAL.ACCOUNT', DIGITAL_PAYMENT:'DIGITAL.PAYMENT', DIGITAL_PLATFORM:'DIGITAL.PLATFORM', DPI_SERVICE:'DPI.SERVICE'
});
const uid=(p)=>`${p}_${randomUUID()}`;
const clamp=(x)=>Math.max(0,Math.min(1,Number(x)||0));
export function createDigitalEvent(input={}){const e={eventId:input.eventId??uid('DEV'),type:input.type??'DIGITAL.EVENT',actor:input.actor??null,subject:input.subject??null,resource:input.resource??null,place:input.place??null,timestamp:input.timestamp??new Date().toISOString(),jurisdiction:input.jurisdiction??null,context:input.context??{},evidence:input.evidence??[],source:input.source??null};e.fingerprint=createHash('sha256').update(JSON.stringify(e)).digest('hex');return e;}
export function classifyDigitalClaim({claim,sourceCount=0,evidenceCount=0,reviewed=false}={}){const text=String(claim??'').trim();if(!text)return{label:'UNKNOWN',confidence:0};const score=Math.min(1,0.2+sourceCount*0.15+evidenceCount*0.15+(reviewed?0.25:0));return{label:reviewed?(score>=0.75?'SUPPORTED':'REVIEW_REQUIRED'):'UNVERIFIED',confidence:clamp(score),claim:text};}
export function createCyberIncident(input={}){return createDigitalEvent({...input,type:DIGITAL_TYPES.CYBER_INCIDENT,context:{severity:'MEDIUM',detectedAt:new Date().toISOString(),...(input.context??{})}});}
export function digitalTrustProfile({identityVerified=false,authorization=false,provenance=false,encryption=false}={}){const controls={identityVerified,authorization,provenance,encryption};const score=Object.values(controls).filter(Boolean).length/4;return{controls,trustLevel:score===1?'HIGH':score>=0.5?'MEDIUM':'LOW',score};}
