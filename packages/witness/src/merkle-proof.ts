import { sha256, type DagHash, type DagNode } from './witness-dag.js';

export interface MerkleProofStep { side: 'left' | 'right'; hash: DagHash }
export interface MerkleInclusionProof { version: 1; leaf: DagHash; root: DagHash; index: number; leafCount: number; steps: MerkleProofStep[] }

export function createMerkleInclusionProof(hashes: DagHash[], leaf: DagHash): MerkleInclusionProof {
  let level = [...new Set(hashes)].sort();
  const index = level.indexOf(leaf);
  if (index < 0) throw new Error(`MERKLE_LEAF_NOT_FOUND:${leaf}`);
  let cursor = index;
  const steps: MerkleProofStep[] = [];
  const leafCount = level.length;
  while (level.length > 1) {
    const siblingIndex = cursor % 2 === 0 ? Math.min(cursor + 1, level.length - 1) : cursor - 1;
    steps.push({ side: cursor % 2 === 0 ? 'right' : 'left', hash: level[siblingIndex] });
    const next: DagHash[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]; const right = level[i + 1] ?? left;
      next.push(sha256(`MW-MERKLE-V1:${left}:${right}`));
    }
    cursor = Math.floor(cursor / 2); level = next;
  }
  return { version: 1, leaf, root: level[0], index, leafCount, steps };
}

export function verifyMerkleInclusionProof(proof: MerkleInclusionProof): boolean {
  if (proof.version !== 1 || !proof.leaf || !proof.root) return false;
  let current = proof.leaf;
  for (const step of proof.steps) {
    current = step.side === 'left'
      ? sha256(`MW-MERKLE-V1:${step.hash}:${current}`)
      : sha256(`MW-MERKLE-V1:${current}:${step.hash}`);
  }
  return current === proof.root;
}

export function proofForNode(nodes: DagNode[], hash: DagHash): MerkleInclusionProof {
  return createMerkleInclusionProof(nodes.map((node) => node.hash), hash);
}
