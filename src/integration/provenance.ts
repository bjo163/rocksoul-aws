// @ts-nocheck
export function envelope({data, source, reference=null, jurisdiction='GLOBAL', effectiveFrom=null, confidence=1, interpretation='FACT'}={}) {
  return {data, provenance:{source,reference,jurisdiction,effectiveFrom,confidence,interpretation,recordedAt:new Date().toISOString()}};
}
