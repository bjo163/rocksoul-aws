// @ts-nocheck
export function legacyProfile(amal={}) { const l=amal.context?.legacy??{}; return {ongoing:Boolean(l.ongoing), beneficiaries:l.beneficiaries??[], durationModel:l.durationModel??"NONE"}; }
