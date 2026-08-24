import { runtimeDataset } from '../persistence/runtime-data.js';

export interface SpaceRegion { id: string; type: string; }
export interface SpaceObject { id: string; type: string; }
export interface SpaceDataset { regions: SpaceRegion[]; objects: SpaceObject[]; }
export interface SpaceCoordinates { x?: number; y?: number; z?: number; latitude?: number; longitude?: number; altitude?: number; }
export type SpaceEventType = 'OBSERVATION' | 'MEASUREMENT' | 'TRANSITION' | 'OTHER';
export interface SpaceEvent { regionId: string; objectId: string | null; eventType: SpaceEventType; coordinates: SpaceCoordinates | null; scope: 'REAL'; }

const getData = (): SpaceDataset => runtimeDataset('data/space.json') as SpaceDataset;

export function getSpaceObject(id: string): SpaceObject | null {
  return getData().objects.find((object) => object.id === id) ?? null;
}

export function getSpaceRegion(id: string): SpaceRegion | null {
  return getData().regions.find((region) => region.id === id) ?? null;
}

export function createSpaceEvent(input: {
  regionId?: string;
  objectId?: string | null;
  eventType?: SpaceEventType;
  coordinates?: SpaceCoordinates | null;
} = {}): SpaceEvent {
  return {
    regionId: input.regionId ?? 'EARTH',
    objectId: input.objectId ?? null,
    eventType: input.eventType ?? 'OBSERVATION',
    coordinates: input.coordinates ?? null,
    scope: 'REAL',
  };
}
