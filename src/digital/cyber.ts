// @ts-nocheck
import { createCyberIncident, createDigitalEvent, DIGITAL_TYPES } from './digital-civilization.js';
export function createCyberAsset(input={}){return createDigitalEvent({...input,type:DIGITAL_TYPES.CYBER_ASSET});}
export function respondToCyberIncident(incident,{state='DETECTED'}={}){const lifecycle=['DETECTED','CLASSIFIED','CONTAINED','INVESTIGATED','RECOVERED','AUDITED'];const i=lifecycle.indexOf(state);return{incidentId:incident.eventId,state,next:lifecycle[Math.min(lifecycle.length-1,Math.max(0,i+1))],lifecycle};}
export {createCyberIncident};
