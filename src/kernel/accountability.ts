type Loose = Record<string, any>;
import crypto from 'node:crypto';

export class AccountabilityKernel {
  declare records: Loose[];
  constructor(){this.records=[];}
  assess({actor, eventId, ruleId=null, evidenceIds=[], affectedIds=[], responsibility={}, remediation=null, notes=null}: Loose = {}): Loose {
    const record={accountabilityId:`ACC_${crypto.randomUUID()}`,actor,eventId,ruleId,evidenceIds,affectedIds,responsibility,remediation,notes,createdAt:new Date().toISOString()};
    this.records.push(record); return structuredClone(record);
  }
  byActor(actor: string): Loose[] {return this.records.filter(r=>r.actor===actor).map(x=>structuredClone(x));}
}
