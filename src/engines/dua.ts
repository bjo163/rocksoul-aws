// @ts-nocheck
export function duaProfile(amal={}) { return {isDua:String(amal.action??"").toUpperCase()==="DUA", request:amal.context?.duaRequest??null, responseBoundary:"DIVINE_ONLY"}; }
