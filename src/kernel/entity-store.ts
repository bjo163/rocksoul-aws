type Loose = Record<string, any>;
import crypto from 'node:crypto';

const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export class EntityStore {
  declare entities: Map<string, Loose>;
  constructor() { this.entities = new Map(); }
  create({type, data = {}, entityId = id('ENT'), version = 1, state='ACTIVE', provenance=[]}: Loose = {}): Loose {
    if (!type) throw new Error('Entity type is required');
    const entity = {entityId, type, version, state, data, provenance, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()};
    this.entities.set(entityId, entity);
    return structuredClone(entity);
  }
  get(entityId: string): Loose | null { const e=this.entities.get(entityId); return e ? structuredClone(e) : null; }
  update(entityId: string, patch: Loose = {}): Loose {
    const e=this.entities.get(entityId); if(!e) throw new Error(`Unknown entity ${entityId}`);
    const next = {...e, ...patch, data:{...e.data, ...(patch.data??{})}, version:e.version+1, updatedAt:new Date().toISOString()};
    this.entities.set(entityId,next); return structuredClone(next);
  }
  list({type=null,state=null}: Loose = {}): Loose[] { return [...this.entities.values()].filter(e=>(!type||e.type===type)&&(!state||e.state===state)).map(x=>structuredClone(x)); }
}
