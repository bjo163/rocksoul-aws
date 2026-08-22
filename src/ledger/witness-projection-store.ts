import { createRequire } from 'node:module';
import type { DagNode, DagCheckpoint } from './witness-dag.js';
import type { SignedCheckpoint } from './distributed-witness.js';
const require=createRequire(import.meta.url);
export class PostgresWitnessProjectionStore {
  private pool:any; constructor(pool?:any){ this.pool=pool ?? new (require('pg').Pool)(); }
  async putNode(node:DagNode){ await this.pool.query(`INSERT INTO witness_nodes(hash,node_id,kind,payload_json,parents_json,occurred_at,actor_id,nonce) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(hash) DO NOTHING`,[node.hash,node.nodeId,node.kind,JSON.stringify(node.payload),JSON.stringify(node.parents),node.occurredAt,node.actorId,node.nonce]); }
  async putKey(record:{keyId:string;witnessId:string;algorithm:string;publicKey:string;status:string;createdAt:string;revokedAt?:string;supersededBy?:string}){ await this.pool.query(`INSERT INTO witness_keys(key_id,witness_id,algorithm,public_key,status,created_at,revoked_at,superseded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(key_id) DO UPDATE SET status=EXCLUDED.status,revoked_at=EXCLUDED.revoked_at,superseded_by=EXCLUDED.superseded_by,public_key=EXCLUDED.public_key`,[record.keyId,record.witnessId,record.algorithm,record.publicKey,record.status,record.createdAt,record.revokedAt??null,record.supersededBy??null]); }
  async putCheckpoint(signed:SignedCheckpoint){ const c=signed.checkpoint; await this.pool.query(`INSERT INTO witness_checkpoints(checkpoint_id,witness_id,root,heads_json,node_count,created_at,algorithm,public_key,signature) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(checkpoint_id,witness_id) DO UPDATE SET root=EXCLUDED.root,heads_json=EXCLUDED.heads_json,node_count=EXCLUDED.node_count,algorithm=EXCLUDED.algorithm,public_key=EXCLUDED.public_key,signature=EXCLUDED.signature`,[c.checkpointId,signed.witnessId,c.root,JSON.stringify(c.heads),c.nodeCount,c.createdAt,signed.algorithm,signed.publicKey,signed.signature]); }
  async loadNodes():Promise<DagNode[]>{ const r=await this.pool.query('SELECT * FROM witness_nodes ORDER BY occurred_at,hash'); return r.rows.map((x:any)=>({hash:x.hash,nodeId:x.node_id,kind:x.kind,payload:x.payload_json,parents:x.parents_json,occurredAt:new Date(x.occurred_at).toISOString(),actorId:x.actor_id,nonce:x.nonce})); }
  async close(){ await this.pool.end?.(); }
}
