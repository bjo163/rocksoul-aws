export function validateCaseIdentity({rid=null, personId=null, ruhId=null, caseId=null, assetRid=null}={}) {
  const errors=[];
  if(!rid) errors.push('RID_REQUIRED');
  if(assetRid && assetRid!==rid) errors.push('ASSET_RID_MISMATCH');
  return {valid:errors.length===0,errors,identifiers:{rid,personId,ruhId,caseId}};
}
