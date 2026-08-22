// @ts-nocheck
import crypto from "node:crypto";
export function createConsent({rid,scope,purpose,granted=false,validUntil=null,source='USER'}={}){
  return {consentId:`CONSENT_${crypto.randomUUID()}`,rid,scope,purpose,granted,validUntil,source,recordedAt:new Date().toISOString()};
}
export function isConsentActive(c, now=new Date()){ if(!c?.granted) return false; if(!c.validUntil) return true; return new Date(c.validUntil)>now; }
