// @ts-nocheck
/** Universal actor identity helpers. RID is reserved for human identities. */
export const ACTOR_TYPES = Object.freeze(['HUMAN','BOT','AI','SYSTEM','SERVICE','PROCESS']);

export function createActor({ id, type, name, status = 'ACTIVE', metadata = {}, createdBy = 'SYSTEM' }) {
  if (!id || !type) throw new TypeError('actor id and type are required');
  if (!ACTOR_TYPES.includes(type)) throw new TypeError(`unsupported actor type: ${type}`);
  const now = new Date().toISOString();
  return {
    id,
    type,
    name: name ?? id,
    status,
    createdAt: now,
    createdBy,
    updatedAt: now,
    updatedBy: createdBy,
    version: 1,
    metadata,
  };
}

export function assertActor(actor) {
  if (!actor || typeof actor !== 'object') throw new TypeError('actor is required');
  if (!actor.id || !ACTOR_TYPES.includes(actor.type)) throw new TypeError('invalid actor');
  return actor;
}
