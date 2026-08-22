// @ts-nocheck
export function versionedRecord(record, {version='1.0.0', validFrom=new Date().toISOString(), validTo=null, supersedes=null}={}) {
  return {...record, version, validFrom, validTo, supersedes, versionedAt:new Date().toISOString()};
}
export function isActiveVersion(record, at = new Date()) {
  const t = new Date(at).getTime();
  return t >= new Date(record.validFrom).getTime() && (!record.validTo || t <= new Date(record.validTo).getTime());
}
