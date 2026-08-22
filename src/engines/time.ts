type Loose = Record<string, any>;
export function now() { return new Date().toISOString(); }
export function makeTimeEvent({occurredAt=now(), calendar='ISO_GREGORIAN', eraId='CURRENT', duration=null, temporalScope='INSTANT'}={}) {
  return {occurredAt,calendar,eraId,duration,temporalScope};
}
export function compareTime(a: string | Date,b: string | Date): number { return new Date(a).getTime()-new Date(b).getTime(); }
