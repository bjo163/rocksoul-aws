import { WitnessDag } from './witness-dag.js';
import { exportWitnessBundle, importWitnessBundle, type WitnessBundle, type WitnessIdentity } from './distributed-witness.js';
import { chunkWitnessBundle, assembleWitnessBundle, type WitnessBundleChunk } from './chunked-bundle.js';

export class WitnessTransportService {
  #identity: WitnessIdentity | null;
  constructor(readonly dag: WitnessDag, identity?: WitnessIdentity | null) { this.#identity = identity ? structuredClone(identity) : null; }
  get identity(): WitnessIdentity | null { return this.#identity ? structuredClone(this.#identity) : null; }
  setIdentity(identity: WitnessIdentity | null): void { this.#identity = identity ? structuredClone(identity) : null; }
  exportBundle(createdAt?: string): WitnessBundle { if(!this.#identity) throw new Error('WITNESS_ACTIVE_KEY_NOT_FOUND'); return exportWitnessBundle(this.dag, this.#identity, createdAt); }
  exportChunks(maxBytes?: number, createdAt?: string): WitnessBundleChunk[] { return chunkWitnessBundle(this.exportBundle(createdAt), maxBytes); }
  importBundle(bundle: WitnessBundle, trustedPublicKey?: string) { return importWitnessBundle(this.dag, bundle, trustedPublicKey); }
  importChunks(chunks: WitnessBundleChunk[], trustedPublicKey?: string) { return this.importBundle(assembleWitnessBundle(chunks), trustedPublicKey); }
}
