// @ts-nocheck
export const DATA_CLASSES=['PUBLIC','PERSONAL','SENSITIVE','RESTRICTED','SECRET','DIVINE_ONLY_OUTSIDE_MODEL'];
const order={PUBLIC:0,PERSONAL:1,SENSITIVE:2,RESTRICTED:3,SECRET:4,DIVINE_ONLY_OUTSIDE_MODEL:5};
export function canAccess({actorClearance='PUBLIC', dataClass='PUBLIC', purpose='UNSPECIFIED', legalBasis=null}={}) {
  if (!DATA_CLASSES.includes(dataClass)) throw new Error(`Unknown data class: ${dataClass}`);
  if (dataClass==='DIVINE_ONLY_OUTSIDE_MODEL') return {allowed:false,reason:'outside model boundary'};
  const allowed=order[actorClearance]>=order[dataClass] && !!purpose;
  return {allowed, reason:allowed?'authorized':'insufficient clearance/purpose', legalBasis};
}
