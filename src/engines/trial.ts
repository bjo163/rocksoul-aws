// @ts-nocheck
export function trialProfile(amal={}) { const t=amal.context?.trial??{}; return {active:Boolean(t.active), type:t.type??null, intensity:Number(t.intensity??0), response:t.response??null}; }
