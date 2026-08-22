import { createPublicKey, sign, verify } from 'node:crypto';

export interface SignatureEnvelope { algorithm: string; keyId: string; signature: string }
export interface SignatureProvider {
  readonly algorithm: string;
  sign(payload: Uint8Array, privateKey: string, keyId: string): SignatureEnvelope;
  verify(payload: Uint8Array, envelope: SignatureEnvelope, publicKey: string): boolean;
}

export class Ed25519SignatureProvider implements SignatureProvider {
  readonly algorithm = 'Ed25519';
  sign(payload: Uint8Array, privateKey: string, keyId: string): SignatureEnvelope {
    return { algorithm: this.algorithm, keyId, signature: sign(null, payload, privateKey).toString('base64') };
  }
  verify(payload: Uint8Array, envelope: SignatureEnvelope, publicKey: string): boolean {
    if (envelope.algorithm !== this.algorithm) return false;
    try { return verify(null, payload, createPublicKey(publicKey), Buffer.from(envelope.signature, 'base64')); } catch { return false; }
  }
}

export class SignatureProviderRegistry {
  #providers = new Map<string, SignatureProvider>();
  register(provider: SignatureProvider): this { this.#providers.set(provider.algorithm, provider); return this; }
  get(algorithm: string): SignatureProvider | null { return this.#providers.get(algorithm) ?? null; }
  algorithms(): string[] { return [...this.#providers.keys()].sort(); }
}

export function defaultSignatureRegistry(): SignatureProviderRegistry {
  return new SignatureProviderRegistry().register(new Ed25519SignatureProvider());
}
