// @ts-nocheck
import crypto from 'node:crypto';

export class AuditLedger {
  constructor({entries = []} = {}) { this.entries = [...entries]; }
  append({type, actor = null, entityId = null, eventId = null, payload = {}, provenance = null} = {}) {
    if (!type) throw new Error('audit.type is required');
    const previousHash = this.entries.at(-1)?.hash ?? '';
    const base = {ledgerId:`LEDGER_${crypto.randomUUID()}`, type, actor, entityId, eventId, payload, provenance, previousHash, recordedAt:new Date().toISOString()};
    const hash = crypto.createHash('sha256').update(previousHash + JSON.stringify(base)).digest('hex');
    const entry = {...base, hash};
    this.entries.push(entry);
    return structuredClone(entry);
  }
  verify() {
    let previousHash = '';
    for (const entry of this.entries) {
      const {hash, ...base} = entry;
      const expected = crypto.createHash('sha256').update(previousHash + JSON.stringify(base)).digest('hex');
      if (expected !== hash) return {ok:false, failedLedgerId:entry.ledgerId};
      previousHash = hash;
    }
    return {ok:true, count:this.entries.length, head:previousHash || null};
  }
  list() { return structuredClone(this.entries); }
  snapshot() { return {entries:this.list()}; }
}
