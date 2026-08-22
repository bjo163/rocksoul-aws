// @ts-nocheck
import { runtimeDataset } from '../persistence/runtime-data.js';
const getStates = () => runtimeDataset('data/world-states.json') as any[];
export function createWorld({state='DUNYA', countryId=null, spaceRegion='EARTH', eraId='CURRENT', calendar='ISO_GREGORIAN'}={}) {
  const states = getStates();
  if (!states.some(s=>s.id===state)) throw new Error(`Unknown world state: ${state}`);
  return {worldId:`WORLD_${crypto.randomUUID()}`, state, countryId, spaceRegion, eraId, calendar, createdAt:new Date().toISOString()};
}
export function transitionWorld(world, state) {
  const states = getStates();
  if (!states.some(s=>s.id===state)) throw new Error(`Unknown world state: ${state}`);
  return {...world, state, transitionedAt:new Date().toISOString()};
}
