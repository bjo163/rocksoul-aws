// @ts-nocheck
import crypto from 'node:crypto';

export function createRid(prefix='RID') {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createPersonRecord({
  rid=createRid(), personId=`PERSON_${crypto.randomUUID()}`, ruhId=`RUH_${crypto.randomUUID()}`,
  displayName=null, birthDate=null, deathDate=null, state='DUNYA', countryCode=null, residency=null,
}={}) {
  return {
    rid, personId, ruhId, displayName, birthDate, deathDate, state, alive: state==='DUNYA' || state==='DYING',
    citizenship: countryCode ? {countryCode, status:'UNSPECIFIED'} : null,
    residency: residency ? {country:residency} : null,
    createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
  };
}

export function assertIdentityLinks(record) {
  if (!record?.rid || !record?.personId || !record?.ruhId) throw new Error('RID record requires rid, personId and ruhId');
  return true;
}
