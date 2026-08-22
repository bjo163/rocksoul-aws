// @ts-nocheck
export function suggestCabAction(signal,{affectedTypes=[],risk='UNKNOWN'}={}) {
  return {signal,changeRequest:{title:String(signal).slice(0,120),status:'DRAFT',affectedTypes,risk,requiresReview:true},next:'CAB_REVIEW'};
}
