// @ts-nocheck
import crypto from 'node:crypto';
export class TreasuryEngine {
  constructor() { this.entries = []; }
  record({sourceType, amount, currency='IDR', destination='UNALLOCATED', jurisdiction='UNSPECIFIED', metadata={}}={}) {
    const entry = {id:`TREASURY_${crypto.randomUUID()}`, sourceType, amount:Number(amount), currency, destination, jurisdiction, metadata, createdAt:new Date().toISOString()};
    this.entries.push(entry); return entry;
  }
  balance(currency='IDR') { return this.entries.filter(x=>x.currency===currency).reduce((s,x)=>s+x.amount,0); }
  summary() { return this.entries.reduce((m,e)=>{m[e.sourceType]=(m[e.sourceType]||0)+e.amount;return m;},{}); }
}
