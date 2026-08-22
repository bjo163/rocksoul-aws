// @ts-nocheck
import assert from 'node:assert/strict';
import { WitnessDag } from '../src/ledger/witness-dag.js';
import { createWitnessIdentity } from '../src/ledger/distributed-witness.js';
import { createMerkleInclusionProof, verifyMerkleInclusionProof } from '../src/ledger/merkle-proof.js';
import { WitnessKeyring } from '../src/ledger/witness-keyring.js';
import { defaultSignatureRegistry } from '../src/ledger/signature-provider.js';
import { WitnessTransportService } from '../src/ledger/witness-transport.js';

const dag=new WitnessDag();
const g=dag.append({nodeId:'G',kind:'GENESIS',payload:{v:1},parents:[],occurredAt:'2026-08-22T00:00:00.000Z',nonce:'g'});
const a=dag.append({nodeId:'A',kind:'OBS',payload:{v:2},parents:[g.hash],occurredAt:'2026-08-22T00:00:01.000Z',nonce:'a'});
const b=dag.append({nodeId:'B',kind:'OBS',payload:{v:3},parents:[g.hash],occurredAt:'2026-08-22T00:00:02.000Z',nonce:'b'});
const m=dag.append({nodeId:'M',kind:'MERGE',payload:{ok:true},parents:[a.hash,b.hash],occurredAt:'2026-08-22T00:00:03.000Z',nonce:'m'});
const proof=createMerkleInclusionProof(dag.list().map(n=>n.hash),a.hash);
assert.equal(proof.root,dag.root()); assert.equal(verifyMerkleInclusionProof(proof),true);
const bad=structuredClone(proof); bad.leaf='0'.repeat(64); assert.equal(verifyMerkleInclusionProof(bad),false);

const kr=new WitnessKeyring(); const k1=kr.create('alpha','2026-08-22T01:00:00.000Z'); const k2=kr.rotate(k1.keyId,'2026-08-22T01:01:00.000Z');
assert.equal(kr.get(k1.keyId)?.status,'SUPERSEDED'); assert.equal(kr.active('alpha')?.keyId,k2.keyId); kr.revoke(k2.keyId,'2026-08-22T01:02:00.000Z'); assert.equal(kr.active('alpha'),null);
const registry=defaultSignatureRegistry(); assert.deepEqual(registry.algorithms(),['Ed25519']);
const provider=registry.get('Ed25519')!; const env=provider.sign(Buffer.from('witness'),k1.identity.privateKey!,k1.keyId); assert.equal(provider.verify(Buffer.from('witness'),env,k1.identity.publicKey),true);

const alice=createWitnessIdentity('alice'); const tx=new WitnessTransportService(dag,alice); const chunks=tx.exportChunks(512,'2026-08-22T02:00:00.000Z'); assert.ok(chunks.length>1);
const target=new WitnessDag(); const rx=new WitnessTransportService(target,createWitnessIdentity('receiver')); const imported=rx.importChunks(chunks,alice.publicKey); assert.equal(imported.imported,4); assert.equal(target.root(),dag.root());
const corrupted=structuredClone(chunks); corrupted[0].payload+='x'; assert.throws(()=>rx.importChunks(corrupted,alice.publicKey),/BUNDLE_CHUNK_INTEGRITY_FAILED/);

console.log(JSON.stringify({ok:true,version:'4.17.0',merkleProofSteps:proof.steps.length,keyRotation:true,algorithms:registry.algorithms(),chunks:chunks.length,root:dag.root()},null,2));
