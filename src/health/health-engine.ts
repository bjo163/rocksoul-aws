// @ts-nocheck
export function healthProfile({rid, conditions=[], encounters=[], coverage=[], consent=true}={}) {
  return {rid, conditions, encounters, coverage, consent, dataClass:'SENSITIVE', standard:'HL7_FHIR', generatedAt:new Date().toISOString()};
}
export function healthEvent({rid, type, occurredAt, source='LOCAL'}={}) {
  return {eventId:`HE_${Date.now()}`,rid,type,occurredAt,source,provenance:{source},dataClass:'SENSITIVE'};
}
export function interoperabilityEnvelope(resource,{profile='IDN_SATUSEHAT_FHIR'}={}){ return {profile,resourceType:resource.resourceType||'Bundle',resource,createdAt:new Date().toISOString()}; }
