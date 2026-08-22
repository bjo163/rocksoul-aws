// @ts-nocheck
export const DISASTER_TYPES=['EARTHQUAKE','TSUNAMI','FLOOD','LANDSLIDE','VOLCANIC','FIRE','PANDEMIC','CYBER','BLACKOUT','FOOD_SHORTAGE','OTHER'];
export function createIncident({incidentId,type,regionCode,severity=0,source='OBSERVED'}={}){ if(!DISASTER_TYPES.includes(type)) throw new Error('INVALID_DISASTER_TYPE'); return {incidentId,type,regionCode,severity,source,status:'DETECTED',timeline:[]}; }
export function transitionIncident(x,status,note=''){ return {...x,status,timeline:[...(x.timeline||[]),{status,note,at:new Date().toISOString()}]}; }
