// @ts-nocheck
export const PROVENANCE_REQUIRED=Object.freeze(['SOURCE','VERSION','JURISDICTION','EFFECTIVE_DATE','CONFIDENCE']);
export function assertProvenance(record={}){const missing=PROVENANCE_REQUIRED.filter(k=>record[k]==null);return{valid:missing.length===0,missing};}
