type Loose = Record<string, any>;
import crypto from 'node:crypto';

export class EvidenceStore {
  declare items: Map<string, Loose>;
  constructor(){this.items=new Map();}
  add({type,source,contentRef=null,confidence=0.0,hash=null,chainOfCustody=[]}: Loose = {}): Loose {
    if(!type||!source) throw new Error('evidence type and source are required');
    const evidenceId=`EVD_${crypto.randomUUID()}`;
    const item={evidenceId,type,source,contentRef,confidence:Math.max(0,Math.min(1,confidence)),hash,chainOfCustody,createdAt:new Date().toISOString()};
    this.items.set(evidenceId,item); return structuredClone(item);
  }
  get(evidenceId: string): Loose | null {const e=this.items.get(evidenceId);return e?structuredClone(e):null;}
}
