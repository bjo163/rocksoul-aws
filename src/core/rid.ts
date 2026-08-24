import crypto from 'node:crypto';

export type PersonState = 'DUNYA' | 'DYING' | string;

export interface PersonRecord {
  rid: string;
  personId: string;
  ruhId: string;
  displayName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  state: PersonState;
  alive: boolean;
  citizenship: { countryCode: string; status: 'UNSPECIFIED' } | null;
  residency: { country: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonRecordInput {
  rid?: string;
  personId?: string;
  ruhId?: string;
  displayName?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  state?: PersonState;
  countryCode?: string | null;
  residency?: string | null;
}

export function createRid(prefix = 'RID'): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createPersonRecord({
  rid = createRid(), personId = `PERSON_${crypto.randomUUID()}`, ruhId = `RUH_${crypto.randomUUID()}`,
  displayName = null, birthDate = null, deathDate = null, state = 'DUNYA', countryCode = null, residency = null,
}: PersonRecordInput = {}): PersonRecord {
  return {
    rid, personId, ruhId, displayName, birthDate, deathDate, state,
    alive: state === 'DUNYA' || state === 'DYING',
    citizenship: countryCode ? { countryCode, status: 'UNSPECIFIED' } : null,
    residency: residency ? { country: residency } : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function assertIdentityLinks(record: Partial<PersonRecord> | null | undefined): true {
  if (!record?.rid || !record?.personId || !record?.ruhId) {
    throw new Error('RID record requires rid, personId and ruhId');
  }
  return true;
}
