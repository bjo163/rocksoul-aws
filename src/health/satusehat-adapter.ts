// @ts-nocheck
export function toSatusehatResource({rid, patientId, resourceType='Patient', payload={}}){
  return {resourceType, id:patientId || rid, meta:{profile:['IDN_SATUSEHAT']}, payload, sourceSystem:'MOONWITNESS_ADAPTER'};
}
export function satusehatEndpointConfig({baseUrl, clientId, organizationId}={}){
  return {baseUrl, clientId, organizationId, transport:'HTTPS_REST', standard:'HL7_FHIR', secretRequired:true};
}
