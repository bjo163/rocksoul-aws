import { randomUUID } from 'node:crypto';
import { runtimeDataset } from '../persistence/runtime-data.js';

export interface WorldState { id: string; kind: string; description: string; }
export interface World {
  worldId: string;
  state: string;
  countryId: string | null;
  spaceRegion: string;
  eraId: string;
  calendar: string;
  createdAt: string;
  transitionedAt?: string;
}

const getStates = (): WorldState[] => runtimeDataset('data/world-states.json') as WorldState[];

export function createWorld(input: {
  state?: string;
  countryId?: string | null;
  spaceRegion?: string;
  eraId?: string;
  calendar?: string;
} = {}): World {
  const state = input.state ?? 'DUNYA';
  if (!getStates().some((candidate) => candidate.id === state)) throw new Error(`Unknown world state: ${state}`);
  return {
    worldId: `WORLD_${randomUUID()}`,
    state,
    countryId: input.countryId ?? null,
    spaceRegion: input.spaceRegion ?? 'EARTH',
    eraId: input.eraId ?? 'CURRENT',
    calendar: input.calendar ?? 'ISO_GREGORIAN',
    createdAt: new Date().toISOString(),
  };
}

export function transitionWorld(world: World, state: string): World {
  if (!getStates().some((candidate) => candidate.id === state)) throw new Error(`Unknown world state: ${state}`);
  return { ...world, state, transitionedAt: new Date().toISOString() };
}
