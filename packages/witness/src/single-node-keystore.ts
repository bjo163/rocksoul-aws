import { createCipheriv, createDecipheriv, randomBytes, scryptSync, randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createWitnessIdentity, type WitnessIdentity } from './distributed-witness.js';

export type LocalWitnessKeyStatus = 'ACTIVE' | 'SUPERSEDED' | 'REVOKED';

export interface LocalWitnessKeyRecord {
  keyId: string;
  witnessId: string;
  algorithm: 'Ed25519';
  publicKey: string;
  status: LocalWitnessKeyStatus;
  createdAt: string;
  revokedAt?: string;
  supersededBy?: string;
}

interface StoredKeyRecord extends LocalWitnessKeyRecord { privateKey: string }
interface KeyStorePayload { version: 1; witnessId: string; keys: StoredKeyRecord[] }
interface EncryptedKeyStoreFile {
  version: 1;
  kdf: 'scrypt';
  cipher: 'aes-256-gcm';
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

function publicRecord(record: StoredKeyRecord): LocalWitnessKeyRecord {
  const { privateKey: _privateKey, ...safe } = record;
  return structuredClone(safe);
}

export class SingleNodeWitnessKeyStore {
  #payload: KeyStorePayload;
  private constructor(readonly filePath: string, private readonly password: string, payload: KeyStorePayload) { this.#payload = payload; }

  static async open(options: { filePath: string; witnessId: string; password: string; createIfMissing?: boolean }): Promise<SingleNodeWitnessKeyStore> {
    if (!options.password) throw new Error('WITNESS_KEY_PASSWORD_REQUIRED');
    let payload: KeyStorePayload;
    let wasMissing = false;
    try {
      const raw = JSON.parse(await readFile(options.filePath, 'utf8')) as EncryptedKeyStoreFile;
      payload = SingleNodeWitnessKeyStore.decrypt(raw, options.password);
      if (payload.witnessId !== options.witnessId) throw new Error('WITNESS_ID_MISMATCH');
    } catch (error: unknown) {
      if ((error as { code?: string })?.code !== 'ENOENT') throw error;
      if (options.createIfMissing === false) throw error;
      wasMissing = true;
      payload = { version: 1, witnessId: options.witnessId, keys: [] };
    }
    const store = new SingleNodeWitnessKeyStore(options.filePath, options.password, payload);
    if (wasMissing) await store.create();
    else await store.persist();
    return store;
  }

  static encrypt(payload: KeyStorePayload, password: string): EncryptedKeyStoreFile {
    const salt = randomBytes(16); const iv = randomBytes(12); const key = scryptSync(password, salt, 32);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    return { version: 1, kdf: 'scrypt', cipher: 'aes-256-gcm', salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
  }

  static decrypt(file: EncryptedKeyStoreFile, password: string): KeyStorePayload {
    if (file?.version !== 1 || file.kdf !== 'scrypt' || file.cipher !== 'aes-256-gcm') throw new Error('WITNESS_KEYSTORE_FORMAT_UNSUPPORTED');
    try {
      const salt = Buffer.from(file.salt, 'base64'); const iv = Buffer.from(file.iv, 'base64'); const tag = Buffer.from(file.tag, 'base64');
      const key = scryptSync(password, salt, 32); const decipher = createDecipheriv('aes-256-gcm', key, iv); decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(Buffer.from(file.ciphertext, 'base64')), decipher.final()]).toString('utf8');
      const payload = JSON.parse(plaintext) as KeyStorePayload;
      if (payload?.version !== 1 || !Array.isArray(payload.keys)) throw new Error('INVALID');
      return payload;
    } catch { throw new Error('WITNESS_KEYSTORE_DECRYPT_FAILED'); }
  }

  async create(at = new Date().toISOString()): Promise<LocalWitnessKeyRecord> {
    if (this.activeRecord()) throw new Error('WITNESS_ACTIVE_KEY_EXISTS');
    const identity = createWitnessIdentity(this.#payload.witnessId, at);
    const record: StoredKeyRecord = { keyId: `WKEY_${randomUUID()}`, witnessId: identity.witnessId, algorithm: 'Ed25519', publicKey: identity.publicKey, privateKey: identity.privateKey!, status: 'ACTIVE', createdAt: at };
    this.#payload.keys.push(record); await this.persist(); return publicRecord(record);
  }

  async rotate(at = new Date().toISOString()): Promise<LocalWitnessKeyRecord> {
    const current = this.activeStored(); if (!current) throw new Error('WITNESS_ACTIVE_KEY_NOT_FOUND');
    current.status = 'SUPERSEDED';
    const identity = createWitnessIdentity(this.#payload.witnessId, at);
    const next: StoredKeyRecord = { keyId: `WKEY_${randomUUID()}`, witnessId: identity.witnessId, algorithm: 'Ed25519', publicKey: identity.publicKey, privateKey: identity.privateKey!, status: 'ACTIVE', createdAt: at };
    current.supersededBy = next.keyId; this.#payload.keys.push(next); await this.persist(); return publicRecord(next);
  }

  async revoke(keyId: string, at = new Date().toISOString()): Promise<LocalWitnessKeyRecord> {
    const record = this.#payload.keys.find((key) => key.keyId === keyId); if (!record) throw new Error('WITNESS_KEY_NOT_FOUND');
    if (record.status === 'REVOKED') return publicRecord(record);
    record.status = 'REVOKED'; record.revokedAt = at; await this.persist(); return publicRecord(record);
  }

  activeRecord(): LocalWitnessKeyRecord | null { const r = this.activeStored(); return r ? publicRecord(r) : null; }
  activeIdentity(): WitnessIdentity | null { const r = this.activeStored(); return r ? { witnessId: r.witnessId, algorithm: r.algorithm, publicKey: r.publicKey, privateKey: r.privateKey, createdAt: r.createdAt } : null; }
  list(): LocalWitnessKeyRecord[] { return this.#payload.keys.map(publicRecord).sort((a,b) => a.createdAt.localeCompare(b.createdAt)); }
  get(keyId: string): LocalWitnessKeyRecord | null { const r=this.#payload.keys.find((key)=>key.keyId===keyId); return r ? publicRecord(r) : null; }

  private activeStored(): StoredKeyRecord | null { return [...this.#payload.keys].filter((key)=>key.status==='ACTIVE').sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0] ?? null; }
  private async persist(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    try { await chmod(path.dirname(this.filePath), 0o700); } catch {}
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(SingleNodeWitnessKeyStore.encrypt(this.#payload, this.password)), { mode: 0o600 });
    await rename(tmp, this.filePath); try { await chmod(this.filePath, 0o600); } catch {}
  }
}

export async function resolveSingleNodeWitnessPassword(options: { dataDir: string; explicitPassword?: string; production?: boolean }): Promise<{ password: string; source: 'env'|'local-secret' }> {
  if (options.explicitPassword) return { password: options.explicitPassword, source: 'env' };
  if (options.production) throw new Error('WITNESS_KEY_PASSWORD_REQUIRED_IN_PRODUCTION');
  const filePath = path.join(options.dataDir, 'witness', '.local-master-secret');
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  try { return { password: (await readFile(filePath, 'utf8')).trim(), source: 'local-secret' }; }
  catch (error: unknown) {
    if ((error as { code?: string })?.code !== 'ENOENT') throw error;
    const password = randomBytes(32).toString('base64url'); await writeFile(filePath, password, { mode: 0o600 }); return { password, source: 'local-secret' };
  }
}
