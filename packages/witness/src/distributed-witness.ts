// @ts-nocheck
import { createHash, generateKeyPairSync, sign, verify, createPublicKey, randomUUID } from 'node:crypto';
import { WitnessDag, type DagCheckpoint, type DagHash, type DagNode } from './witness-dag.js';

export interface WitnessIdentity {
  witnessId: string;
  algorithm: 'Ed25519';
  publicKey: string;
  privateKey?: string;
  createdAt: string;
}

export interface SignedCheckpoint {
  checkpoint: DagCheckpoint;
  witnessId: string;
  algorithm: 'Ed25519';
  publicKey: string;
  signature: string;
}

export interface WitnessBundle {
  version: 1;
  bundleId: string;
  sourceWitnessId: string;
  createdAt: string;
  nodes: DagNode[];
  checkpoint: DagCheckpoint;
  checkpointSignature: SignedCheckpoint;
  manifestHash: string;
  signature: string;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function checkpointBody(checkpoint: DagCheckpoint): Buffer {
  return Buffer.from(canonical({
    checkpointId: checkpoint.checkpointId,
    heads: [...checkpoint.heads].sort(),
    root: checkpoint.root,
    nodeCount: checkpoint.nodeCount,
    createdAt: checkpoint.createdAt,
  }));
}

export function createWitnessIdentity(witnessId = `WIT_${randomUUID()}`, createdAt = new Date().toISOString()): WitnessIdentity {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    witnessId,
    algorithm: 'Ed25519',
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    createdAt,
  };
}

export function publicWitness(identity: WitnessIdentity): WitnessIdentity {
  const { privateKey: _privateKey, ...safe } = identity;
  return structuredClone(safe);
}

export function signCheckpoint(checkpoint: DagCheckpoint, identity: WitnessIdentity): SignedCheckpoint {
  if (!identity.privateKey) throw new Error('WITNESS_PRIVATE_KEY_REQUIRED');
  const signature = sign(null, checkpointBody(checkpoint), identity.privateKey).toString('base64');
  return {
    checkpoint: structuredClone(checkpoint),
    witnessId: identity.witnessId,
    algorithm: 'Ed25519',
    publicKey: identity.publicKey,
    signature,
  };
}

export function verifySignedCheckpoint(signed: SignedCheckpoint, trustedPublicKey?: string): boolean {
  if (signed.algorithm !== 'Ed25519') return false;
  if (trustedPublicKey && trustedPublicKey !== signed.publicKey) return false;
  try {
    return verify(null, checkpointBody(signed.checkpoint), createPublicKey(signed.publicKey), Buffer.from(signed.signature, 'base64'));
  } catch {
    return false;
  }
}

export function evaluateCheckpointQuorum(signatures: SignedCheckpoint[], options: {
  threshold: number;
  trustedWitnesses?: Record<string, string>;
}): { valid: boolean; approvals: number; threshold: number; witnessIds: string[]; checkpointRoot: DagHash | null } {
  const threshold = Math.max(1, Math.trunc(options.threshold));
  if (!signatures.length) return { valid: false, approvals: 0, threshold, witnessIds: [], checkpointRoot: null };
  const target = signatures[0].checkpoint;
  const targetDigest = digest(target);
  const accepted = new Set<string>();
  for (const signed of signatures) {
    if (digest(signed.checkpoint) !== targetDigest) continue;
    const trustedKey = options.trustedWitnesses?.[signed.witnessId];
    if (options.trustedWitnesses && !trustedKey) continue;
    if (verifySignedCheckpoint(signed, trustedKey)) accepted.add(signed.witnessId);
  }
  return {
    valid: accepted.size >= threshold,
    approvals: accepted.size,
    threshold,
    witnessIds: [...accepted].sort(),
    checkpointRoot: target.root,
  };
}

function bundleManifest(bundle: Omit<WitnessBundle, 'manifestHash' | 'signature'>) {
  return {
    version: bundle.version,
    bundleId: bundle.bundleId,
    sourceWitnessId: bundle.sourceWitnessId,
    createdAt: bundle.createdAt,
    nodeHashes: bundle.nodes.map((node) => node.hash).sort(),
    checkpoint: bundle.checkpoint,
    checkpointSignature: bundle.checkpointSignature,
  };
}

export function exportWitnessBundle(dag: WitnessDag, identity: WitnessIdentity, createdAt = new Date().toISOString()): WitnessBundle {
  if (!identity.privateKey) throw new Error('WITNESS_PRIVATE_KEY_REQUIRED');
  const checkpoint = dag.checkpoint(createdAt);
  const checkpointSignature = signCheckpoint(checkpoint, identity);
  const unsigned = {
    version: 1 as const,
    bundleId: `WBD_${randomUUID()}`,
    sourceWitnessId: identity.witnessId,
    createdAt,
    nodes: dag.list(),
    checkpoint,
    checkpointSignature,
  };
  const manifestHash = digest(bundleManifest(unsigned));
  const signature = sign(null, Buffer.from(manifestHash), identity.privateKey).toString('base64');
  return { ...unsigned, manifestHash, signature };
}

export function verifyWitnessBundle(bundle: WitnessBundle, trustedPublicKey?: string): { valid: boolean; reason?: string } {
  if (bundle.version !== 1) return { valid: false, reason: 'BUNDLE_VERSION_UNSUPPORTED' };
  if (bundle.sourceWitnessId !== bundle.checkpointSignature.witnessId) return { valid: false, reason: 'WITNESS_ID_MISMATCH' };
  if (digest(bundleManifest(bundle)) !== bundle.manifestHash) return { valid: false, reason: 'MANIFEST_HASH_MISMATCH' };
  if (!verifySignedCheckpoint(bundle.checkpointSignature, trustedPublicKey)) return { valid: false, reason: 'CHECKPOINT_SIGNATURE_INVALID' };
  if (digest(bundle.checkpointSignature.checkpoint) !== digest(bundle.checkpoint)) return { valid: false, reason: 'CHECKPOINT_MISMATCH' };
  try {
    const key = trustedPublicKey ?? bundle.checkpointSignature.publicKey;
    if (!verify(null, Buffer.from(bundle.manifestHash), createPublicKey(key), Buffer.from(bundle.signature, 'base64'))) {
      return { valid: false, reason: 'BUNDLE_SIGNATURE_INVALID' };
    }
    const reconstructed = WitnessDag.fromSnapshot({ version: 1, nodes: bundle.nodes });
    if (!reconstructed.verify().valid) return { valid: false, reason: 'DAG_INVALID' };
    if (reconstructed.root() !== bundle.checkpoint.root) return { valid: false, reason: 'CHECKPOINT_ROOT_MISMATCH' };
    if (reconstructed.list().length !== bundle.checkpoint.nodeCount) return { valid: false, reason: 'CHECKPOINT_COUNT_MISMATCH' };
    if (canonical(reconstructed.heads()) !== canonical([...bundle.checkpoint.heads].sort())) return { valid: false, reason: 'CHECKPOINT_HEADS_MISMATCH' };
    return { valid: true };
  } catch {
    return { valid: false, reason: 'BUNDLE_DAG_INVALID' };
  }
}

export function importWitnessBundle(target: WitnessDag, bundle: WitnessBundle, trustedPublicKey?: string): {
  imported: number;
  existing: number;
  root: DagHash | null;
  heads: DagHash[];
} {
  const checked = verifyWitnessBundle(bundle, trustedPublicKey);
  if (!checked.valid) throw new Error(`WITNESS_BUNDLE_INVALID:${checked.reason}`);
  const pending = new Map(bundle.nodes.map((node) => [node.hash, node]));
  let imported = 0;
  let existing = 0;
  while (pending.size) {
    let progressed = false;
    for (const [hash, node] of [...pending.entries()]) {
      if (target.get(hash)) {
        pending.delete(hash); existing++; progressed = true; continue;
      }
      if (node.parents.every((parent) => Boolean(target.get(parent)) || !pending.has(parent))) {
        try {
          target.import(node);
          pending.delete(hash); imported++; progressed = true;
        } catch (error) {
          if (!String(error).includes('QDAG_PARENT_NOT_FOUND')) throw error;
        }
      }
    }
    if (!progressed) throw new Error('WITNESS_BUNDLE_RECONCILIATION_STALLED');
  }
  return { imported, existing, root: target.root(), heads: target.heads() };
}

export function reconcileWitnessBundles(bundles: WitnessBundle[], trustedWitnesses: Record<string, string> = {}): {
  dag: WitnessDag;
  acceptedBundles: string[];
  rejectedBundles: { bundleId: string; reason: string }[];
} {
  const dag = new WitnessDag();
  const acceptedBundles: string[] = [];
  const rejectedBundles: { bundleId: string; reason: string }[] = [];
  const remaining = [...bundles];
  while (remaining.length) {
    let progressed = false;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const bundle = remaining[i];
      const trustedKey = trustedWitnesses[bundle.sourceWitnessId];
      if (Object.keys(trustedWitnesses).length && !trustedKey) {
        rejectedBundles.push({ bundleId: bundle.bundleId, reason: 'UNTRUSTED_WITNESS' });
        remaining.splice(i, 1); progressed = true; continue;
      }
      const checked = verifyWitnessBundle(bundle, trustedKey);
      if (!checked.valid) {
        rejectedBundles.push({ bundleId: bundle.bundleId, reason: checked.reason ?? 'INVALID' });
        remaining.splice(i, 1); progressed = true; continue;
      }
      try {
        importWitnessBundle(dag, bundle, trustedKey);
        acceptedBundles.push(bundle.bundleId);
        remaining.splice(i, 1); progressed = true;
      } catch (error) {
        if (!String(error).includes('RECONCILIATION_STALLED')) {
          rejectedBundles.push({ bundleId: bundle.bundleId, reason: String(error) });
          remaining.splice(i, 1); progressed = true;
        }
      }
    }
    if (!progressed) {
      for (const bundle of remaining) rejectedBundles.push({ bundleId: bundle.bundleId, reason: 'MISSING_CAUSAL_HISTORY' });
      break;
    }
  }
  return { dag, acceptedBundles: acceptedBundles.sort(), rejectedBundles };
}
