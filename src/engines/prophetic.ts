// @ts-nocheck
import { runtimeDataset } from '../persistence/runtime-data.js';
const getProphets=()=>runtimeDataset('data/prophets.json') as any[];
export function getProphet(id){return getProphets().find(p=>p.id===id)??null;}
export function createScenario({prophetId,worldState='DUNYA',sourceProfile='QURAN'}={}){const p=getProphet(prophetId);if(!p)throw new Error('Unknown prophet profile');return {scenarioId:`SCENARIO_${crypto.randomUUID()}`,prophetId,worldState,sourceProfile,mode:'REAL',roleType:'SHADOW_REFERENCE'};}
