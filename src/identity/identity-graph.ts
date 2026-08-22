// @ts-nocheck
import crypto from 'node:crypto';

export class IdentityGraph {
  constructor() { this.nodes=new Map(); this.edges=[]; }
  addNode({id,type,label=null,data={}}) { this.nodes.set(id,{id,type,label,data}); return this.nodes.get(id); }
  link({from,to,relation,validFrom=null,validTo=null,provenance=null}) {
    const edge={edgeId:`EDGE_${crypto.randomUUID()}`,from,to,relation,validFrom,validTo,provenance};
    this.edges.push(edge); return edge;
  }
  neighbors(id, relation=null) { return this.edges.filter(e=>e.from===id && (!relation || e.relation===relation)); }
  reverseNeighbors(id, relation=null) { return this.edges.filter(e=>e.to===id && (!relation || e.relation===relation)); }
  snapshot() { return {nodes:[...this.nodes.values()],edges:this.edges}; }
}
