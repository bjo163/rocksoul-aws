export function provenance({sourceType='SYSTEM',sourceId=null,reference=null,authority='UNKNOWN',confidence=0.5,interpreted=false}={}){
  return {sourceType,sourceId,reference,authority,confidence,interpreted,recordedAt:new Date().toISOString()};
}
