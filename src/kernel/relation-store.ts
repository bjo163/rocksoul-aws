type Loose = Record<string, any>;
import crypto from 'node:crypto';

export class RelationStore {
  declare relations: Map<string, Loose>;
  constructor() { this.relations = new Map(); }
  link({from, type, to, validFrom=null, validTo=null, source=null, metadata={}}: Loose = {}): Loose {
    if(!from||!type||!to) throw new Error('from, type and to are required');
    const relationId = `REL_${crypto.randomUUID()}`;
    const relation = {relationId, from, type, to, validFrom, validTo, source, metadata, createdAt:new Date().toISOString()};
    this.relations.set(relationId, relation);
    return structuredClone(relation);
  }
  query({from=null,type=null,to=null}: Loose = {}): Loose[] {
    return [...this.relations.values()].filter(r=>(!from||r.from===from)&&(!type||r.type===type)&&(!to||r.to===to)).map(x=>structuredClone(x));
  }
  integrity(entityIds: Set<string> = new Set()): Loose {
    const broken = [...this.relations.values()].filter(r => entityIds.size && (!entityIds.has(r.from)||!entityIds.has(r.to)));
    return {ok:broken.length===0, broken:broken.map(x=>structuredClone(x))};
  }
}
