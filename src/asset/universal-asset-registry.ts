// @ts-nocheck
import crypto from 'node:crypto';

export const ASSET_TYPES = Object.freeze([
  'MONEY','CASH','BANK_ACCOUNT','GOLD','SILVER','SECURITY','BUSINESS','PROPERTY','LAND',
  'BUILDING','INVENTORY','VEHICLE','RECEIVABLE','INTELLECTUAL_PROPERTY','DIGITAL_ASSET',
  'PUBLIC_ASSET','INFRASTRUCTURE','NATURAL_RESOURCE','WATER','ENERGY','SPACE_ASSET','OTHER'
]);

export const ASSET_STATES = Object.freeze([
  'PLANNED','DESIGNED','PROCURED','CONSTRUCTED','COMMISSIONED','OPERATING',
  'MAINTENANCE','UPGRADED','SUSPENDED','RETIRED','DISPOSED','ARCHIVED'
]);

const now = () => new Date().toISOString();
const uid = (prefix) => `${prefix}_${crypto.randomUUID()}`;

export class UniversalAssetRegistry {
  constructor({entities, relations, events, resources, states, typeRegistry} = {}) {
    this.entities = entities;
    this.relations = relations;
    this.events = events;
    this.resources = resources;
    this.states = states;
    this.typeRegistry = typeRegistry;
    this.assets = new Map();
    this.metrics = new Map();
  }

  registerType({typeId, category, defaults = {}, metadata = {}}) {
    if (this.typeRegistry && !this.typeRegistry.get(typeId)) {
      this.typeRegistry.register({
        typeId,
        entityFamily: 'ASSET',
        domain: category ?? 'ASSET',
        defaults,
        metadata
      });
    }
    return this.typeRegistry?.get(typeId) ?? {typeId, entityFamily:'ASSET', domain:category};
  }

  createAsset(input = {}) {
    const {
      assetId = uid('ASSET'), rid = null, type = 'OTHER', name = null,
      category = 'GENERAL', quantity = null, unit = null, value = 0,
      currency = 'IDR', ownerId = rid, operatorId = null, locationId = null,
      projectId = null, status = 'PLANNED', provenance = [], metadata = {}
    } = input;
    if (!type) throw new Error('asset type required');
    this.registerType({typeId: `ASSET.${type}`, category});

    const entity = this.entities?.create({
      entityId: assetId,
      type: `ASSET.${type}`,
      data: {
        assetId, rid, type, name, category, quantity, unit, value: Number(value) || 0,
        currency, ownerId, operatorId, locationId, projectId, status, metadata
      },
      state: status,
      provenance
    }) ?? null;

    const asset = {
      assetId, rid, type, name, category, quantity, unit,
      value: Number(value) || 0, currency, ownerId, operatorId, locationId,
      projectId, status, provenance, metadata,
      createdAt: now(), updatedAt: now()
    };
    this.assets.set(assetId, asset);
    this.#setState(assetId, status, {reason:'CREATE'});
    if (ownerId && this.relations) this.relations.link({from:ownerId,type:'OWNS',to:assetId});
    if (operatorId && this.relations) this.relations.link({from:assetId,type:'OPERATED_BY',to:operatorId});
    if (locationId && this.relations) this.relations.link({from:assetId,type:'LOCATED_AT',to:locationId});
    if (projectId && this.relations) this.relations.link({from:assetId,type:'DELIVERED_BY',to:projectId});
    this.#appendEvent('ASSET_CREATED', ownerId, assetId, {asset});
    return structuredClone(entity ? { ...asset, entity } : asset);
  }

  get(assetId) { return this.assets.get(assetId) ? structuredClone(this.assets.get(assetId)) : null; }
  list({type=null,status=null,ownerId=null,category=null} = {}) {
    return [...this.assets.values()]
      .filter(a => (!type || a.type === type) && (!status || a.status === status) && (!ownerId || a.ownerId === ownerId) && (!category || a.category === category))
      .map(a => structuredClone(a));
  }

  transition(assetId, nextStatus, metadata = {}) {
    if (!ASSET_STATES.includes(nextStatus)) throw new Error(`Unknown asset state ${nextStatus}`);
    const asset = this.assets.get(assetId); if (!asset) throw new Error(`Unknown asset ${assetId}`);
    const previousStatus = asset.status;
    asset.status = nextStatus;
    asset.updatedAt = now();
    this.#setState(assetId, nextStatus, {previousStatus, ...metadata});
    this.#appendEvent('ASSET_STATE_CHANGED', asset.ownerId, assetId, {previousStatus, nextStatus, metadata});
    return structuredClone(asset);
  }

  updateValue(assetId, value, reason = 'REVALUATION') {
    const asset = this.assets.get(assetId); if (!asset) throw new Error(`Unknown asset ${assetId}`);
    const previousValue = asset.value;
    asset.value = Number(value) || 0;
    asset.updatedAt = now();
    this.#appendEvent('ASSET_VALUE_CHANGED', asset.ownerId, assetId, {previousValue, value:asset.value, reason});
    return structuredClone(asset);
  }

  transferOwnership({assetId, from, to, relationType='OWNS'} = {}) {
    const asset = this.assets.get(assetId); if (!asset) throw new Error(`Unknown asset ${assetId}`);
    if (from && asset.ownerId !== from) throw new Error(`Asset ${assetId} is not owned by ${from}`);
    const previousOwner = asset.ownerId;
    asset.ownerId = to;
    asset.rid = this.#resolveRid(to) ?? asset.rid;
    asset.updatedAt = now();
    if (this.relations) {
      if (from) this.relations.link({from, type:'OWNED_PREVIOUSLY', to:assetId, metadata:{endedAt:now()}});
      this.relations.link({from:to, type:relationType, to:assetId, metadata:{effectiveAt:now()}});
    }
    this.#appendEvent('ASSET_TRANSFERRED', to, assetId, {previousOwner, newOwner:to});
    return structuredClone(asset);
  }

  linkInfrastructure({assetId, projectId=null, budgetId=null, ownerId=null, operatorId=null, locationId=null} = {}) {
    const asset = this.assets.get(assetId); if (!asset) throw new Error(`Unknown asset ${assetId}`);
    for (const [type,to] of [['DELIVERED_BY',projectId],['FUNDED_BY',budgetId],['OWNED_BY',ownerId],['OPERATED_BY',operatorId],['LOCATED_AT',locationId]]) {
      if (to && this.relations) this.relations.link({from:assetId,type,to});
    }
    Object.assign(asset, {projectId:projectId ?? asset.projectId, operatorId:operatorId ?? asset.operatorId, locationId:locationId ?? asset.locationId});
    asset.updatedAt = now();
    return structuredClone(asset);
  }

  addMetric(assetId, metric, value, unit=null, source=null) {
    if (!this.assets.has(assetId)) throw new Error(`Unknown asset ${assetId}`);
    const key = `${assetId}:${metric}`;
    const record = {metricId:uid('METRIC'), assetId, metric, value, unit, source, recordedAt:now()};
    this.metrics.set(key, record);
    this.#appendEvent('ASSET_METRIC_RECORDED', this.assets.get(assetId).ownerId, assetId, record);
    return structuredClone(record);
  }

  lifecycleCost(assetId, {capex=0, opex=0, maintenance=0, decommissioning=0} = {}) {
    if (!this.assets.has(assetId)) throw new Error(`Unknown asset ${assetId}`);
    const total = Number(capex)+Number(opex)+Number(maintenance)+Number(decommissioning);
    const result = {assetId, capex:Number(capex), opex:Number(opex), maintenance:Number(maintenance), decommissioning:Number(decommissioning), lifecycleCost:total, currency:this.assets.get(assetId).currency};
    this.#appendEvent('ASSET_LIFECYCLE_COST_MODELED', this.assets.get(assetId).ownerId, assetId, result);
    return result;
  }

  riskProfile(assetId, factors = {}) {
    if (!this.assets.has(assetId)) throw new Error(`Unknown asset ${assetId}`);
    const values = Object.fromEntries(Object.entries(factors).map(([k,v]) => [k, Math.max(0, Math.min(1, Number(v)||0))]));
    const raw = Object.values(values).reduce((a,b) => a+b, 0);
    const count = Math.max(1, Object.keys(values).length);
    const score = raw / count;
    const band = score >= .8 ? 'CRITICAL' : score >= .6 ? 'HIGH' : score >= .3 ? 'MEDIUM' : 'LOW';
    const result = {assetId, score, band, factors:values};
    this.#appendEvent('ASSET_RISK_PROFILED', this.assets.get(assetId).ownerId, assetId, result);
    return result;
  }

  #resolveRid(id) {
    const e = this.entities?.get(id);
    return e?.data?.rid ?? (String(id).startsWith('RID_') ? id : null);
  }
  #appendEvent(type, actor, subject, context) {
    return this.events?.append({type, actor:actor??null, subject, context, links:[subject]});
  }
  #setState(entityId, state, metadata) { this.states?.set(entityId, state, metadata); }
}
