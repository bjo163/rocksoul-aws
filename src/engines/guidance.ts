// @ts-nocheck
export function guidanceProfile(amal={}) { return {source:amal.context?.guidanceSource??null, response:amal.context?.guidanceResponse??"UNKNOWN", confidence:Number(amal.context?.guidanceConfidence??0)}; }
