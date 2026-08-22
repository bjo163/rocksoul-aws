// @ts-nocheck
import crypto from 'node:crypto';

const clone = (x) => structuredClone(x);
const makeId = (prefix) => `${prefix}_${crypto.randomUUID()}`;

export class GraphStore {
  constructor({snapshot = null} = {}) {
    this.entities = new Map();
    this.relations = new Map();
    this.events = new Map();
    this.resources = new Map();
    this.assets = new Map();
    if (snapshot) this.load(snapshot);
  }

  createEntity({entityId = makeId('ENT'), type, data = {}, state = 'ACTIVE', provenance = []} = {}) {
    if (!type) throw new Error('entity.type is required');
    if (this.entities.has(entityId)) throw new Error(`Duplicate entityId: ${entityId}`);
    const now = new Date().toISOString();
    const entity = {entityId, type, data, state, provenance, createdAt: now, updatedAt: now};
    this.entities.set(entityId, entity);
    return clone(entity);
  }

  updateEntity(entityId, updates = {}) {
    const entity = this.entities.get(entityId);
    if (!entity) throw new Error(`Entity not found: ${entityId}`);
    const updatedEntity = {
      ...entity,
      ...updates,
      data: { ...entity.data, ...(updates.data || {}) },
      updatedAt: new Date().toISOString()
    };
    this.entities.set(entityId, updatedEntity);
    return clone(updatedEntity);
  }

  deleteEntity(entityId) {
    if (!this.entities.has(entityId)) throw new Error(`Entity not found: ${entityId}`);
    this.entities.delete(entityId);
    return true;
  }

  getEntity(entityId) { return clone(this.entities.get(entityId) ?? null); }
  listEntities({type = null, state = null, q = null} = {}) {
    const query = q ? q.toLowerCase() : null;
    return [...this.entities.values()]
      .filter(e => (!type || e.type === type) && (!state || e.state === state))
      .filter(e => {
        if (!query) return true;
        if (e.entityId.toLowerCase().includes(query)) return true;
        if (e.type.toLowerCase().includes(query)) return true;
        return JSON.stringify(e.data).toLowerCase().includes(query);
      })
      .map(clone);
  }

  relate({relationId = makeId('REL'), from, type, to, validFrom = null, validTo = null, source = null, metadata = {}} = {}) {
    if (!from || !type || !to) throw new Error('relation.from, relation.type and relation.to are required');
    if (!this.entities.has(from) || !this.entities.has(to)) throw new Error('Relations must reference existing entities');
    if (this.relations.has(relationId)) throw new Error(`Duplicate relationId: ${relationId}`);
    const relation = {relationId, from, type, to, validFrom, validTo, source, metadata, createdAt: new Date().toISOString()};
    this.relations.set(relationId, relation);
    return clone(relation);
  }

  queryRelations({from = null, type = null, to = null} = {}) {
    return [...this.relations.values()]
      .filter(r => (!from || r.from === from) && (!type || r.type === type) && (!to || r.to === to))
      .map(clone);
  }

  appendEvent({eventId = makeId('EVT'), type, actor = null, subject = null, place = null, time = null, context = {}, evidence = [], links = []} = {}) {
    if (!type) throw new Error('event.type is required');
    if (actor && !this.entities.has(actor)) throw new Error(`Unknown event actor: ${actor}`);
    if (subject && !this.entities.has(subject)) throw new Error(`Unknown event subject: ${subject}`);
    const event = {eventId, type, actor, subject, place, time: time ?? new Date().toISOString(), context, evidence, links, createdAt: new Date().toISOString()};
    this.events.set(eventId, event);
    return clone(event);
  }

  getEvent(eventId) { return clone(this.events.get(eventId) ?? null); }
  listEvents({type = null, actor = null, subject = null} = {}) {
    return [...this.events.values()]
      .filter(e => (!type || e.type === type) && (!actor || e.actor === actor) && (!subject || e.subject === subject))
      .map(clone);
  }

  createResource({resourceId = makeId('RES'), type, owner = null, value = 0, currency = 'IDR', quantity = null, unit = null, metadata = {}} = {}) {
    if (!type) throw new Error('resource.type is required');
    if (owner && !this.entities.has(owner)) throw new Error(`Unknown resource owner: ${owner}`);
    const resource = {resourceId, type, owner, value, currency, quantity, unit, metadata, createdAt: new Date().toISOString()};
    this.resources.set(resourceId, resource);
    return clone(resource);
  }

  createAsset({assetId = makeId('AST'), type, owner = null, operator = null, location = null, status = 'PLANNED', value = 0, currency = 'IDR', data = {}} = {}) {
    if (!type) throw new Error('asset.type is required');
    if (owner && !this.entities.has(owner)) throw new Error(`Unknown asset owner: ${owner}`);
    if (operator && !this.entities.has(operator)) throw new Error(`Unknown asset operator: ${operator}`);
    const asset = {assetId, type, owner, operator, location, status, value, currency, data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()};
    this.assets.set(assetId, asset);
    return clone(asset);
  }

  transferResource({resourceId, from, to, value = null, eventId = null, reason = null} = {}) {
    const resource = this.resources.get(resourceId);
    if (!resource) throw new Error(`Unknown resource: ${resourceId}`);
    if (resource.owner !== from) throw new Error('Resource transfer owner mismatch');
    if (to && !this.entities.has(to)) throw new Error(`Unknown transfer recipient: ${to}`);
    resource.owner = to;
    return this.appendEvent({type: 'RESOURCE_TRANSFER', actor: from, subject: to, context: {resourceId, value: value ?? resource.value, reason, eventId}});
  }

  graphFor(entityId) {
    return {
      entity: this.getEntity(entityId),
      outgoing: this.queryRelations({from: entityId}),
      incoming: this.queryRelations({to: entityId}),
      eventsByActor: this.listEvents({actor: entityId}),
      eventsBySubject: this.listEvents({subject: entityId}),
      resources: [...this.resources.values()].filter(r => r.owner === entityId).map(clone),
      assets: [...this.assets.values()].filter(a => a.owner === entityId || a.operator === entityId).map(clone)
    };
  }

  snapshot() {
    return {
      entities: [...this.entities.values()],
      relations: [...this.relations.values()],
      events: [...this.events.values()],
      resources: [...this.resources.values()],
      assets: [...this.assets.values()]
    };
  }

  load(snapshot = {}) {
    for (const e of snapshot.entities ?? []) this.entities.set(e.entityId, e);
    for (const r of snapshot.relations ?? []) this.relations.set(r.relationId, r);
    for (const e of snapshot.events ?? []) this.events.set(e.eventId, e);
    for (const r of snapshot.resources ?? []) this.resources.set(r.resourceId, r);
    for (const a of snapshot.assets ?? []) this.assets.set(a.assetId, a);
  }

  integrity() {
    const missingRelationRefs = [...this.relations.values()].filter(r => !this.entities.has(r.from) || !this.entities.has(r.to));
    const missingEventActors = [...this.events.values()].filter(e => (e.actor && !this.entities.has(e.actor)) || (e.subject && !this.entities.has(e.subject)));
    const missingResourceOwners = [...this.resources.values()].filter(r => r.owner && !this.entities.has(r.owner));
    const missingAssetOwners = [...this.assets.values()].filter(a => (a.owner && !this.entities.has(a.owner)) || (a.operator && !this.entities.has(a.operator)));
    return {
      ok: !missingRelationRefs.length && !missingEventActors.length && !missingResourceOwners.length && !missingAssetOwners.length,
      counts: {entities: this.entities.size, relations: this.relations.size, events: this.events.size, resources: this.resources.size, assets: this.assets.size},
      missing: {relations: missingRelationRefs.map(clone), eventActors: missingEventActors.map(clone), resourceOwners: missingResourceOwners.map(clone), assetOwners: missingAssetOwners.map(clone)}
    };
  }
}
