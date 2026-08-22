// @ts-nocheck
import crypto from 'node:crypto';

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

export function hashPayload(payload) {
  return crypto.createHash('sha256').update(canonical(payload)).digest('hex');
}

export class ImmutableAuditLedger {
  constructor({entries=[]}={}) { this.entries = entries.map(e => structuredClone(e)); }
  append({eventType, actorId=null, entityId=null, payload={}, provenance=[], occurredAt=new Date().toISOString(), sourceVersion=null, modelVersion=null}={}) {
    if (!eventType) throw new Error('eventType is required');
    const previousHash = this.entries.at(-1)?.hash ?? null;
    const entry = {
      ledgerId:`IAL_${crypto.randomUUID()}`,
      sequence:this.entries.length + 1,
      eventType, actorId, entityId, payload, provenance,
      occurredAt, recordedAt:new Date().toISOString(), previousHash,
      sourceVersion, modelVersion
    };
    const hash = hashPayload(entry);
    const stored = Object.freeze({...entry, hash});
    this.entries.push(stored);
    return structuredClone(stored);
  }
  verify() {
    let previousHash = null;
    for (const entry of this.entries) {
      const {hash, ...body} = entry;
      const expected = hashPayload(body);
      if (expected !== hash || entry.previousHash !== previousHash) return {ok:false, sequence:entry.sequence, ledgerId:entry.ledgerId};
      previousHash = hash;
    }
    return {ok:true, count:this.entries.length, head:previousHash};
  }
  history(entityId=null) { return structuredClone(entityId ? this.entries.filter(x=>x.entityId===entityId) : this.entries); }
  snapshot() { return {entries:this.history(), integrity:this.verify()}; }
}
