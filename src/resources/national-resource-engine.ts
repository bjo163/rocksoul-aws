// @ts-nocheck
export const RESOURCE_TYPES=['FOOD','WATER','ENERGY','LAND','MINERALS','FOREST','FISHERIES','STRATEGIC_RESERVE'];
export function resourceState({resourceId,type,regionCode,quantity,unit}={}){ return {resourceId,type,regionCode,quantity,unit,updatedAt:new Date().toISOString()}; }
