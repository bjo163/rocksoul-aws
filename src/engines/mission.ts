// @ts-nocheck
export function missionProfile(amal={}) { const m=amal.context?.mission??{}; return {propheticModel:Boolean(m.propheticModel), profile:m.profile??null, sourceRefs:m.sourceRefs??[]}; }
