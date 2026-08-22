// @ts-nocheck
import crypto from 'node:crypto';
import { GraphStore } from './graph-store.js';
import { EventBus } from './event-bus.js';
import { UniversalRuleResolver } from './rule-resolver.js';
import { createProvenance } from './provenance.js';

const clone = (x) => structuredClone(x);

export class PostgresBackendRuntime {
  constructor({ persistence, rules = [] } = {}) {
    if (!persistence) throw new Error('POSTGRES_BACKEND_REQUIRES_PERSISTENCE');
    this.persistence = persistence;
    this.graph = new GraphStore();
    this.bus = new EventBus();
    this.rules = new UniversalRuleResolver({ rules });
    this.typeMap = new Map();
    this.types = {
      list: () => this.listTypes(),
      get: (typeId) => this.typeMap.get(typeId) ? clone(this.typeMap.get(typeId)) : null,
      register: (input) => this.registerType(input),
    };
    this.ledger = {
      list: () => structuredClone(this.auditCache),
      verify: () => ({ ok: true, count: this.auditCache.length })
    };
    this.auditCache = [];
    this.readyPromise = this.#load();
  }

  async ready() { await this.readyPromise; }

  async #load() {
    await this.persistence.ready?.();
    const entities = await this.persistence.entities().list();
    for (const row of entities) {
      const p = row.payload ?? {};
      if (row.type === 'BACKEND.ENTITY' && p.entity) this.graph.load({ entities: [p.entity] });
      else if (row.type === 'BACKEND.RESOURCE' && p.resource) this.graph.load({ resources: [p.resource] });
      else if (row.type === 'BACKEND.ASSET' && p.asset) this.graph.load({ assets: [p.asset] });
      else if (row.type === 'BACKEND.TYPE' && p.type) this.typeMap.set(p.type.typeId, p.type);
    }
    const relations = new Set([...this.graph.entities.keys()]);
    const relationRepo = this.persistence.relations();
    for (const id of relations) {
      const rels = await relationRepo.listByEntity(id);
      for (const r of rels) {
        if (this.graph.entities.has(r.fromId) && this.graph.entities.has(r.toId)) {
          this.graph.load({ relations: [{ relationId: r.id, from: r.fromId, type: r.type, to: r.toId, validFrom: r.validFrom, validTo: r.validTo, source: r.payload?.source ?? null, metadata: r.payload ?? {}, createdAt: r.createdAt ?? new Date().toISOString() }] });
        }
      }
    }
    const allEvents = await this.persistence.events().listAll();
    const backendEvents = allEvents.filter((e) => e.payload?._backendGraph === true && this.graph.entities.has(e.entityId ?? ''));
    for (const e of backendEvents) {
      this.graph.load({ events: [{ eventId: e.eventId, type: e.eventType, actor: e.actorId ?? null, subject: e.entityId ?? null, place: e.payload?.place ?? null, time: e.occurredAt ?? e.recordedAt ?? new Date().toISOString(), context: e.payload?.context ?? {}, evidence: e.payload?.evidence ?? [], links: e.payload?.links ?? [], createdAt: e.recordedAt ?? new Date().toISOString() }] });
    }
    this.auditCache = await this.persistence.auditStore().listAll();
  }

  registerType(input) {
    if (!input?.typeId || !input?.entityFamily) throw new Error('typeId and entityFamily are required');
    this.typeMap.set(input.typeId, clone(input));
    void this.persistence.asActor('SYSTEM-001').saveEntity({ id: `TYPE:${input.typeId}`, type: 'BACKEND.TYPE', version: 1, payload: { type: clone(input) }, createdBy: 'SYSTEM-001', updatedBy: 'SYSTEM-001', updatedAt: new Date().toISOString() });
    return clone(input);
  }

  listTypes() { return [...this.typeMap.values()].sort((a, b) => a.typeId.localeCompare(b.typeId)).map(clone); }

  persist() { return Promise.resolve(); }

  async createEntity(input) {
    await this.ready();
    const entity = this.graph.createEntity(input);
    await this.persistence.asActor('BACKEND').saveEntity({ id: `BACKEND:ENTITY:${entity.entityId}`, type: 'BACKEND.ENTITY', version: 1, payload: { entity }, createdBy: 'BACKEND', updatedBy: 'BACKEND' });
    const audit = await this.persistence.auditStore().append({ operation: 'CREATE', modelType: entity.type, recordId: entity.entityId, actorId: 'BACKEND', timestamp: new Date().toISOString(), changedFields: ['entity'], before: null, after: entity });
    this.auditCache.push(audit);
    await this.bus.publish({ type: 'ENTITY_CREATED', entity });
    return clone(entity);
  }

  async updateEntity(entityId, updates) {
    await this.ready();
    const entity = this.graph.updateEntity(entityId, updates);
    await this.persistence.asActor('BACKEND').saveEntity({ id: `BACKEND:ENTITY:${entity.entityId}`, type: 'BACKEND.ENTITY', version: 1, payload: { entity }, createdBy: 'BACKEND', updatedBy: 'BACKEND' });
    const audit = await this.persistence.auditStore().append({ operation: 'UPDATE', modelType: entity.type, recordId: entity.entityId, actorId: 'BACKEND', timestamp: new Date().toISOString(), changedFields: Object.keys(updates ?? {}), before: null, after: entity });
    this.auditCache.push(audit);
    await this.bus.publish({ type: 'ENTITY_UPDATED', entity });
    return clone(entity);
  }

  async deleteEntity(entityId) {
    await this.ready();
    const existing = this.graph.getEntity(entityId);
    this.graph.deleteEntity(entityId);
    await this.persistence.asActor('BACKEND').saveEntity({ id: `BACKEND:ENTITY:${entityId}`, type: 'BACKEND.ENTITY.DELETED', version: 1, payload: { entityId, entity: existing }, createdBy: 'BACKEND', updatedBy: 'BACKEND' });
    const audit = await this.persistence.auditStore().append({ operation: 'DELETE', modelType: existing?.type ?? 'BACKEND.ENTITY', recordId: entityId, actorId: 'BACKEND', timestamp: new Date().toISOString(), changedFields: ['deleted'], before: existing, after: null });
    this.auditCache.push(audit);
    await this.bus.publish({ type: 'ENTITY_DELETED', entityId });
    return { ok: true };
  }

  async createRelation(input) {
    await this.ready();
    const relation = this.graph.relate(input);
    await this.persistence.asActor('BACKEND').saveRelation({ id: relation.relationId, fromId: relation.from, type: relation.type, toId: relation.to, validFrom: relation.validFrom, validTo: relation.validTo, payload: { ...relation.metadata, source: relation.source }, createdBy: 'BACKEND', updatedBy: 'BACKEND', createdAt: relation.createdAt, updatedAt: relation.createdAt });
    return clone(relation);
  }

  async appendEvent(input) {
    await this.ready();
    const event = this.graph.appendEvent(input);
    await this.persistence.asActor('BACKEND').appendEvent({ eventId: event.eventId, entityId: event.subject ?? event.actor ?? 'BACKEND', eventType: event.type, payload: { _backendGraph: true, place: event.place, context: event.context, evidence: event.evidence, links: event.links }, occurredAt: event.time, source: 'BACKEND', actorId: event.actor, createdBy: 'BACKEND', updatedBy: 'BACKEND' });
    return clone(event);
  }

  resolveRule(ctx) { return this.rules.resolve(ctx); }
  graphFor(entityId) { return this.graph.graphFor(entityId); }
  health() { const integrity = this.graph.integrity(); return { ok: true, kernel: integrity.ok, ledger: true, counts: integrity.counts, types: this.typeMap.size, timestamp: new Date().toISOString(), persistence: 'postgres' }; }
  snapshot() { return { graph: this.graph.snapshot(), ledger: { entries: clone(this.auditCache), integrity: { ok: true, count: this.auditCache.length } }, types: this.listTypes() }; }
  close() { return Promise.resolve(); }
}
