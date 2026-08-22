type Loose = Record<string, any>;
import crypto from 'node:crypto';

export class ResourceStore {
  declare resources: Map<string, Loose>; declare flows: Loose[];
  constructor(){this.resources=new Map();this.flows=[];}
  create({type,owner=null,quantity=null,unit=null,value=0,currency='IDR',metadata={}}: Loose = {}): Loose {
    if(!type) throw new Error('Resource type is required');
    const resourceId=`RES_${crypto.randomUUID()}`;
    const r={resourceId,type,owner,quantity,unit,value,currency,metadata,createdAt:new Date().toISOString()};
    this.resources.set(resourceId,r); return structuredClone(r);
  }
  transfer({resourceId,from,to,value=null,reason=null,eventId=null}: Loose = {}): Loose {
    const r=this.resources.get(resourceId); if(!r) throw new Error(`Unknown resource ${resourceId}`);
    const flow: Loose={flowId:`FLOW_${crypto.randomUUID()}`,resourceId,from,to,value:value??r.value,reason,eventId,createdAt:new Date().toISOString()};
    this.flows.push(flow); r.owner=to; return structuredClone(flow);
  }
  byOwner(owner: string): Loose[] {return [...this.resources.values()].filter(r=>r.owner===owner).map(x=>structuredClone(x));}
  flowsByOwner(owner: string): Loose[] {return this.flows.filter(f=>f.from===owner||f.to===owner).map(x=>structuredClone(x));}
}
