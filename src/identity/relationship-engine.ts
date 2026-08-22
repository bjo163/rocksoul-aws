// @ts-nocheck
const RELATION_TYPES = [
  'FAMILY','SPOUSE','PARENT','CHILD','GUARDIAN','TEACHER','EMPLOYER','EMPLOYEE',
  'OFFICIAL','CITIZEN','VICTIM','DEFENDANT','PLAINTIFF','BENEFICIARY','OWNER','TRUSTEE'
];
export function validateRelationship(r) {
  if (!RELATION_TYPES.includes(r.relation)) throw new Error(`Unknown relation: ${r.relation}`);
  if (!r.from || !r.to) throw new Error('Relationship requires from and to');
  return true;
}
export function relationshipTypeList(){return [...RELATION_TYPES];}
