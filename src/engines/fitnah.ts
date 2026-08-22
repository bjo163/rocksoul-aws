// @ts-nocheck
export function fitnahProfile(amal={}) { const f=amal.context?.fitnah??{}; return {active:Boolean(f.active), type:f.type??null, confusion:Number(f.confusion??0), pressure:Number(f.pressure??0)}; }
