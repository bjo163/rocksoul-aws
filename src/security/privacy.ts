// @ts-nocheck
export const DATA_CLASSES = ['PUBLIC','INTERNAL','PERSONAL','SENSITIVE','RESTRICTED','SECRET'];
export function visibilityFor(record, requested, actor={roles:[]}) {
  if (!record?.dataClass) return {allowed:false, reason:'NO_DATA_CLASS'};
  if (record.dataClass==='PUBLIC') return {allowed:true, reason:'PUBLIC'};
  if (actor.roles?.includes('PRIVACY_OFFICER') || actor.roles?.includes('SUPER_ADMIN')) return {allowed:true, reason:'PRIVILEGED_ROLE'};
  return {allowed: record.ownerRid && record.ownerRid===actor.rid && requested==='SELF', reason:record.ownerRid===actor.rid?'OWNER_SCOPE':'RESTRICTED'};
}
