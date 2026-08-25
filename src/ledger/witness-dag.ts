// @ts-nocheck
import { createHash, randomUUID } from 'node:crypto';

export type DagHash = string;

export interface DagNode<T = Record<string, unknown>> {
  nodeId: string;
  kind: string;
  payload: T;
  parents: DagHash[];
  occurredAt: string;
  actorId: string | null;
  nonce: string;
  hash: DagHash;
}

export interface DagCheckpoint {
  checkpointId: string;
  heads: DagHash[];
  root: DagHash;
  nodeCount: number;
  createdAt: string;
}

export interface DagVerification {
  valid: boolean;
  nodes: number;
  heads: DagHash[];
  root: DagHash | null;
  failedHash?: DagHash;
  reason?: 'HASH_MISMATCH' | 'MISSING_PARENT' | 'CYCLE' | 'DUPLICATE_NODE_ID';
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
}

export function sha256(value: unknown): DagHash {
  return createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
}

export function hashDagNode(node: Omit<DagNode, 'hash'>): DagHash {
  return sha256({
    nodeId: node.nodeId,
    kind: node.kind,
    payload: node.payload,
    parents: [...node.parents].sort(),
    occurredAt: node.occurredAt,
    actorId: node.actorId,
    nonce: node.nonce,
  });
}

export function merkleRoot(hashes: DagHash[]): DagHash | null {
  if (hashes.length === 0) return null;
  let level = [...new Set(hashes)].sort();
  while (level.length > 1) {
    const next: DagHash[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      next.push(sha256(`MW-MERKLE-V1:${left}:${right}`));
    }
    level = next;
  }
  return level[0];
}

/**
 * WitnessDag is a deterministic, content-addressed DAG.
 *
 * "Q-DAG" is a project codename. This implementation does not claim
 * quantum entanglement or quantum-computing security. Its security
 * properties come from classical cryptographic hashes and explicit
 * multi-parent causal links.
 */
export class WitnessDag {
  #nodes = new Map<DagHash, DagNode>();
  #nodeIds = new Map<string, DagHash>();
  #children = new Map<DagHash, Set<DagHash>>();

  append<T = Record<string, unknown>>(input: {
    nodeId?: string;
    kind: string;
    payload: T;
    parents?: DagHash[];
    occurredAt?: string;
    actorId?: string | null;
    nonce?: string;
  }): DagNode<T> {
    if (!input.kind) throw new Error('QDAG_KIND_REQUIRED');
    const parents = [...new Set(input.parents ?? this.heads())].sort();
    for (const parent of parents) {
      if (!this.#nodes.has(parent)) throw new Error(`QDAG_PARENT_NOT_FOUND:${parent}`);
    }
    const nodeId = input.nodeId ?? `QDG_${randomUUID()}`;
    if (this.#nodeIds.has(nodeId)) throw new Error(`QDAG_DUPLICATE_NODE_ID:${nodeId}`);

    const body = {
      nodeId,
      kind: input.kind,
      payload: structuredClone(input.payload),
      parents,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      actorId: input.actorId ?? null,
      nonce: input.nonce ?? randomUUID(),
    };
    const node = Object.freeze({ ...body, hash: hashDagNode(body) }) as DagNode<T>;
    this.#nodes.set(node.hash, node as DagNode);
    this.#nodeIds.set(node.nodeId, node.hash);
    for (const parent of parents) {
      const children = this.#children.get(parent) ?? new Set<DagHash>();
      children.add(node.hash);
      this.#children.set(parent, children);
    }
    return structuredClone(node);
  }

  import(node: DagNode): DagNode {
    if (this.#nodes.has(node.hash)) return this.get(node.hash)!;
    if (this.#nodeIds.has(node.nodeId)) throw new Error(`QDAG_DUPLICATE_NODE_ID:${node.nodeId}`);
    for (const parent of node.parents) {
      if (!this.#nodes.has(parent)) throw new Error(`QDAG_PARENT_NOT_FOUND:${parent}`);
    }
    if (hashDagNode(node) !== node.hash) throw new Error(`QDAG_HASH_MISMATCH:${node.hash}`);
    const frozen = Object.freeze(structuredClone(node));
    this.#nodes.set(node.hash, frozen);
    this.#nodeIds.set(node.nodeId, node.hash);
    for (const parent of node.parents) {
      const children = this.#children.get(parent) ?? new Set<DagHash>();
      children.add(node.hash);
      this.#children.set(parent, children);
    }
    return structuredClone(frozen);
  }

  get(hash: DagHash): DagNode | null {
    const node = this.#nodes.get(hash);
    return node ? structuredClone(node) : null;
  }

  getById(nodeId: string): DagNode | null {
    const hash = this.#nodeIds.get(nodeId);
    return hash ? this.get(hash) : null;
  }

  list(): DagNode[] {
    return [...this.#nodes.values()]
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.hash.localeCompare(b.hash))
      .map((node) => structuredClone(node));
  }

  heads(): DagHash[] {
    return [...this.#nodes.keys()]
      .filter((hash) => (this.#children.get(hash)?.size ?? 0) === 0)
      .sort();
  }

  root(): DagHash | null {
    return merkleRoot([...this.#nodes.keys()]);
  }

  checkpoint(createdAt = new Date().toISOString()): DagCheckpoint {
    return {
      checkpointId: `QCP_${randomUUID()}`,
      heads: this.heads(),
      root: this.root() ?? sha256('MW-QDAG-EMPTY-V1'),
      nodeCount: this.#nodes.size,
      createdAt,
    };
  }

  ancestors(hash: DagHash): DagHash[] {
    if (!this.#nodes.has(hash)) return [];
    const found = new Set<DagHash>();
    const visit = (current: DagHash) => {
      const node = this.#nodes.get(current);
      if (!node) return;
      for (const parent of node.parents) {
        if (!found.has(parent)) {
          found.add(parent);
          visit(parent);
        }
      }
    };
    visit(hash);
    return [...found].sort();
  }

  verify(): DagVerification {
    const seenIds = new Set<string>();
    const visiting = new Set<DagHash>();
    const visited = new Set<DagHash>();

    const walk = (hash: DagHash): DagVerification | null => {
      if (visited.has(hash)) return null;
      if (visiting.has(hash)) return { valid: false, nodes: this.#nodes.size, heads: this.heads(), root: this.root(), failedHash: hash, reason: 'CYCLE' };
      const node = this.#nodes.get(hash)!;
      visiting.add(hash);
      if (seenIds.has(node.nodeId)) return { valid: false, nodes: this.#nodes.size, heads: this.heads(), root: this.root(), failedHash: hash, reason: 'DUPLICATE_NODE_ID' };
      seenIds.add(node.nodeId);
      if (hashDagNode(node) !== hash) return { valid: false, nodes: this.#nodes.size, heads: this.heads(), root: this.root(), failedHash: hash, reason: 'HASH_MISMATCH' };
      for (const parent of node.parents) {
        if (!this.#nodes.has(parent)) return { valid: false, nodes: this.#nodes.size, heads: this.heads(), root: this.root(), failedHash: hash, reason: 'MISSING_PARENT' };
        const failed = walk(parent);
        if (failed) return failed;
      }
      visiting.delete(hash);
      visited.add(hash);
      return null;
    };

    for (const hash of this.#nodes.keys()) {
      const failed = walk(hash);
      if (failed) return failed;
    }
    return { valid: true, nodes: this.#nodes.size, heads: this.heads(), root: this.root() };
  }

  /** Backward-compatible integrity alias used by recovery contracts and older callers. */
  integrity(): DagVerification {
    return this.verify();
  }

  snapshot(): { version: 1; nodes: DagNode[]; checkpoint: DagCheckpoint } {
    return { version: 1, nodes: this.list(), checkpoint: this.checkpoint() };
  }

  static fromSnapshot(snapshot: { version: 1; nodes: DagNode[] }): WitnessDag {
    if (snapshot?.version !== 1) throw new Error('QDAG_SNAPSHOT_VERSION_UNSUPPORTED');
    const dag = new WitnessDag();
    const pending = new Map(snapshot.nodes.map((node) => [node.hash, structuredClone(node)]));
    while (pending.size) {
      let progressed = false;
      for (const [hash, node] of [...pending.entries()]) {
        if (node.parents.every((parent) => dag.#nodes.has(parent))) {
          dag.import(node);
          pending.delete(hash);
          progressed = true;
        }
      }
      if (!progressed) throw new Error('QDAG_SNAPSHOT_HAS_MISSING_PARENT_OR_CYCLE');
    }
    return dag;
  }
}
