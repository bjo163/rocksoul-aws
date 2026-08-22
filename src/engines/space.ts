// @ts-nocheck
import { runtimeDataset } from '../persistence/runtime-data.js';
const getData = () => runtimeDataset('data/space.json') as any;
export function getSpaceObject(id){ const data=getData(); return data.objects.find(x=>x.id===id) ?? null; }
export function getSpaceRegion(id){ const data=getData(); return data.regions.find(x=>x.id===id) ?? null; }
export function createSpaceEvent({regionId='EARTH',objectId=null,eventType='OBSERVATION',coordinates=null}={}) {
  return {regionId,objectId,eventType,coordinates,scope:'REAL'};
}
