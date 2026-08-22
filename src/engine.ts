// @ts-nocheck
import crypto from 'node:crypto';
import {validateGenesis} from './engines/genesis.js';
import {evaluateMizan} from './engines/mizan.js';
import {createWorld} from './engines/world.js';
import {makeTimeEvent} from './engines/time.js';
import {getCountry} from './engines/geography.js';
import {getSpaceRegion} from './engines/space.js';
import { asmaEngineSnapshot } from './revelation/asma/asma-engine.js';
const semanticPlaceholder=()=>({R:0,G:0,B:0,L:0});
export function createPerson({ruhId=`RUH_${crypto.randomUUID()}`,alive=true}={}){return {personId:`PERSON_${crypto.randomUUID()}`,ruhId,alive,state:alive?'DUNYA':'DECEASED',createdAt:new Date().toISOString()};}
export function createAmal({person,sourceId,gatewayId,processId,action,intention='UNKNOWN',countryId=null,spaceRegion='EARTH',factors={}}){
  const genesis=validateGenesis({sourceId,gatewayId,processId});
  return {amalId:`AMAL_${crypto.randomUUID()}`,ruhId:person.ruhId,genesis,action,intention,world:{country:getCountry(countryId),space:getSpaceRegion(spaceRegion)},time:makeTimeEvent(),factors,evidence:[],createdAt:new Date().toISOString()};
}
export function evaluateAmal(amal,{semantic=null,semanticVector=null,scale=null}={}){
  const vec=semantic??semanticPlaceholder();
  const sv=semanticVector ?? {mode: amal.factors?.mode ?? 'REFLECTION'};
  const m=evaluateMizan({semantic:vec,semanticVector:sv,factors:amal.factors ?? {},scale:scale ?? amal.scale ?? {}});
  return {amal,asma:{engine:'PURE_REVELATION_ASMA_V1',summary:asmaEngineSnapshot(process.cwd(),{maxCandidates:12,maxFields:4})},semantic:vec,semanticVector:sv,mizan:m,destination:'NOT_DETERMINABLE',modelBoundary:'FINAL_JUDGMENT_REMAINS_OUTSIDE_MODEL'};
}
export function createWorldRecord(opts={}){return createWorld(opts);}
