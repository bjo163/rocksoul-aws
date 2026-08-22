// @ts-nocheck
export function createScenario({scenarioId,baseState,assumptions=[],options=[],horizon='UNKNOWN'}={}){return{scenarioId,type:'REAL_SCENARIO',baseState,assumptions,options,horizon,status:'DRAFT',createdAt:new Date().toISOString()};}
