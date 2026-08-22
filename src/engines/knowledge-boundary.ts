// @ts-nocheck
export const KNOWLEDGE_STATES=["OBSERVED","RECORDED","INFERRED","UNCERTAIN","UNKNOWN","DIVINE_ONLY"];
export function knowledgeBoundary(value,state="UNKNOWN") { return {value,state:KNOWLEDGE_STATES.includes(state)?state:"UNKNOWN"}; }
