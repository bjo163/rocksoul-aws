// @ts-nocheck
export function communityProfile(amal={}) { const c=amal.context?.community??{}; return {level:c.level??"INDIVIDUAL", affectedGroups:c.affectedGroups??[]}; }
