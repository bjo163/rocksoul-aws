// @ts-nocheck
export function reputationProfile(amal={}) { const r=amal.context?.reputation??{}; return {public:Boolean(r.public), narrative:r.narrative??null, truthStatus:r.truthStatus??"UNKNOWN"}; }
