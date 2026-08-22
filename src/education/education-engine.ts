// @ts-nocheck
export function educationProfile({rid, enrollments=[], credentials=[], learningEvents=[], accessibility=[]}={}) {
  return {rid,enrollments,credentials,learningEvents,accessibility,dataClass:'PERSONAL',generatedAt:new Date().toISOString()};
}
export function educationEvent({rid,type,institutionId,occurredAt,source='LOCAL'}={}) {
  return {eventId:`EDU_${Date.now()}`,rid,type,institutionId,occurredAt,source,dataClass:'PERSONAL'};
}
export function studentProgress({completed=0,total=0,attendance=0}={}) { return {completed,total,attendance,completionRate:total?Number((completed/total).toFixed(4)):0}; }
