// @ts-nocheck
/** Canonical metadata contract for every persisted MoonWitness model. */
export const REQUIRED_AUDIT_FIELDS = Object.freeze([
  'id','type','schemaVersion','version','createdAt','createdBy','updatedAt','updatedBy','status','visibility','provenance','metadata'
]);

export const ACTOR_TYPES = Object.freeze(['HUMAN','BOT','AI','SYSTEM','SERVICE','PROCESS']);

export function assertActorRef(actor, field = 'actor') {
  if (typeof actor === 'string') {
    if (!actor.trim()) throw new TypeError(`${field} must not be empty`);
    return actor;
  }
  if (!actor || typeof actor !== 'object') throw new TypeError(`${field} is required`);
  if (!ACTOR_TYPES.includes(actor.actorType)) throw new TypeError(`${field}.actorType is invalid`);
  if (!actor.actorId || typeof actor.actorId !== 'string') throw new TypeError(`${field}.actorId is required`);
  return actor;
}

export function createBaseModel({ id, type, createdBy, data = {}, status = 'ACTIVE', visibility = 'PRIVATE', provenance = {}, metadata = {}, schemaVersion = 1 }) {
  if (!id || !type) throw new TypeError('id and type are required');
  assertActorRef(createdBy, 'createdBy');
  const now = new Date().toISOString();
  return {
    id, type, schemaVersion, version: 1,
    createdAt: now, createdBy, updatedAt: now, updatedBy: createdBy,
    status, visibility, data, provenance, metadata
  };
}

export function updateBaseModel(record, { updatedBy, patch = {} } = {}) {
  assertBaseModel(record);
  assertActorRef(updatedBy, 'updatedBy');
  return { ...record, ...patch, version: record.version + 1, updatedAt: new Date().toISOString(), updatedBy };
}

export function assertBaseModel(record) {
  for (const key of REQUIRED_AUDIT_FIELDS) {
    if (!(key in (record ?? {}))) throw new Error(`missing required model field: ${key}`);
  }
  if (!Number.isInteger(record.version) || record.version < 1) throw new Error('version must be a positive integer');
  assertActorRef(record.createdBy, 'createdBy');
  assertActorRef(record.updatedBy, 'updatedBy');
  return record;
}
