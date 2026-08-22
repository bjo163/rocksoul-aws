// @ts-nocheck
export function lawProfile(amal){return {lawfulStatus:amal.context?.lawfulStatus??'UNASSESSED',source:amal.context?.lawSource??'UNSPECIFIED',jurisdiction:amal.context?.jurisdiction??'UNSPECIFIED',evidenceStandard:amal.context?.evidenceStandard??'UNSPECIFIED'};}
