// @ts-nocheck
export function classifyCommunityMember({personId, communityType='OTHER', civicStatus='RESIDENT', rights=[], duties=[]}) {
  return { personId, communityType, civicStatus, rights, duties };
}
