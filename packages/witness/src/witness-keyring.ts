import { randomUUID } from 'node:crypto';
import { createWitnessIdentity, publicWitness, type WitnessIdentity } from './distributed-witness.js';

export interface WitnessKeyRecord { keyId: string; witnessId: string; identity: WitnessIdentity; status: 'ACTIVE'|'REVOKED'|'SUPERSEDED'; createdAt: string; revokedAt?: string; supersededBy?: string }

export class WitnessKeyring {
  #keys = new Map<string, WitnessKeyRecord>();
  create(witnessId: string, createdAt = new Date().toISOString()): WitnessKeyRecord {
    const identity = createWitnessIdentity(witnessId, createdAt);
    const record = { keyId: `WKEY_${randomUUID()}`, witnessId, identity, status: 'ACTIVE' as const, createdAt };
    this.#keys.set(record.keyId, record); return structuredClone(record);
  }
  rotate(keyId: string, at = new Date().toISOString()): WitnessKeyRecord {
    const current = this.#keys.get(keyId); if (!current || current.status !== 'ACTIVE') throw new Error('WITNESS_KEY_NOT_ACTIVE');
    const next = this.create(current.witnessId, at); current.status = 'SUPERSEDED'; current.supersededBy = next.keyId; return next;
  }
  revoke(keyId: string, at = new Date().toISOString()): void { const record=this.#keys.get(keyId); if(!record) throw new Error('WITNESS_KEY_NOT_FOUND'); record.status='REVOKED'; record.revokedAt=at; }
  get(keyId: string): WitnessKeyRecord | null { const x=this.#keys.get(keyId); return x ? structuredClone(x) : null; }
  active(witnessId: string): WitnessKeyRecord | null { return [...this.#keys.values()].filter(x=>x.witnessId===witnessId&&x.status==='ACTIVE').sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0] ?? null; }
  trustedPublicKeys(witnessId?: string): Record<string,string> { const out:Record<string,string>={}; for(const r of this.#keys.values()) if(r.status==='ACTIVE'&&(!witnessId||r.witnessId===witnessId)) out[r.witnessId]=publicWitness(r.identity).publicKey; return out; }
}
