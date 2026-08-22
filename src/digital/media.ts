import { classifyDigitalClaim, createDigitalEvent, DIGITAL_TYPES } from './digital-civilization.js';
export const createMediaContent=(input={})=>createDigitalEvent({...input,type:DIGITAL_TYPES.MEDIA_CONTENT});
export const analyzeMediaClaim=(input={})=>classifyDigitalClaim(input);
