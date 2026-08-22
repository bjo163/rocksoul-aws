import { Router, isRecord, httpError, requirePermission } from '../router.js';
import { proofForNode } from '../../../../src/ledger/merkle-proof.js';
import { verifySignedCheckpoint } from '../../../../src/ledger/distributed-witness.js';

export const witnessRouter = new Router();

witnessRouter.add('GET','/api/v1/witness/status', async (req,_res,_params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'READ_AUDIT'); if(!authz.ok) return authz.error;
  const verification=ctx.witness.dag.verify(); const active=ctx.witness.keyStore.activeRecord();
  return { version:'4.20.0', mode:'single-node', witnessId:active?.witnessId??null, algorithm:active?.algorithm??null, activeKeyId:active?.keyId??null, signingAvailable:Boolean(active), keyPasswordSource:ctx.witness.keyPasswordSource, nodes:verification.nodes, heads:verification.heads, root:verification.root, valid:verification.valid, checkpoints:ctx.witness.checkpoints.list().length, persistence:ctx.witness.store?'postgres+local-keystore':'local-keystore' };
});

witnessRouter.add('GET','/api/v1/witness/keys', async (req,_res,_params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'ADMIN'); if(!authz.ok) return authz.error;
  return { mode:'single-node', keys:ctx.witness.keyStore.list() };
});

witnessRouter.add('POST','/api/v1/witness/keys/rotate', async (req,_res,_params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'ADMIN'); if(!authz.ok) return authz.error;
  const key=await ctx.witness.keyStore.rotate(); await ctx.witness.persistKeys(); await ctx.witness.refreshTransportIdentity(); ctx.witness.metrics.record('KEY_ROTATED');
  return { status:'ROTATED', key };
});

witnessRouter.add('POST','/api/v1/witness/keys/revoke', async (req,_res,_params,body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'ADMIN'); if(!authz.ok) return authz.error;
  const p=isRecord(body)?body:{}; if(typeof p.keyId!=='string') return httpError(400,'WITNESS_KEY_ID_REQUIRED');
  try { const key=await ctx.witness.keyStore.revoke(p.keyId); await ctx.witness.persistKeys(); const active=ctx.witness.keyStore.activeIdentity(); ctx.witness.transport.setIdentity(active); ctx.witness.metrics.record('KEY_REVOKED'); return { status:'REVOKED', key, signingAvailable:Boolean(active) }; }
  catch(error){ const message=error instanceof Error?error.message:String(error); if(message==='WITNESS_KEY_NOT_FOUND') return httpError(404,message); throw error; }
});

witnessRouter.add('POST','/api/v1/witness/keys/create', async (req,_res,_params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'ADMIN'); if(!authz.ok) return authz.error;
  try { const key=await ctx.witness.keyStore.create(); await ctx.witness.persistKeys(); await ctx.witness.refreshTransportIdentity(); ctx.witness.metrics.record('KEY_CREATED'); return { status:'CREATED', key }; }
  catch(error){ const message=error instanceof Error?error.message:String(error); if(message==='WITNESS_ACTIVE_KEY_EXISTS') return httpError(409,message); throw error; }
});

witnessRouter.add('POST','/api/v1/witness/checkpoints', async (req,_res,_params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'ADMIN'); if(!authz.ok) return authz.error;
  try { const signed=await ctx.witness.createCheckpoint(); return { status:'SIGNED', authority:'1-of-1-local', signed }; }
  catch(error){ const message=error instanceof Error?error.message:String(error); if(message==='WITNESS_ACTIVE_KEY_NOT_FOUND') return httpError(409,message); throw error; }
});

witnessRouter.add('GET','/api/v1/witness/checkpoints', async (req,_res,_params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'READ_AUDIT'); if(!authz.ok) return authz.error;
  const keys=ctx.witness.keyStore.list(); const checkpoints=ctx.witness.checkpoints.list().map((signed:any)=>{ const key=keys.find((k:any)=>k.witnessId===signed.witnessId&&k.publicKey===signed.publicKey); return { ...signed, valid:Boolean(key)&&verifySignedCheckpoint(signed,key?.publicKey) }; });
  return { authority:'1-of-1-local', checkpoints };
});

witnessRouter.add('GET','/api/v1/witness/proof/:hash', async (req,_res,params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'READ_AUDIT'); if(!authz.ok) return authz.error;
  if(!ctx.witness.dag.get(params.hash)) return httpError(404,'WITNESS_NODE_NOT_FOUND');
  return proofForNode(ctx.witness.dag.list(),params.hash);
});

// Bundle endpoints remain local/admin utilities in v4.20.0. No peer discovery or network consensus is active.
witnessRouter.add('POST','/api/v1/witness/export', async (req,_res,_params,body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'READ_AUDIT'); if(!authz.ok) return authz.error;
  if(!ctx.witness.keyStore.activeIdentity()) return httpError(409,'WITNESS_ACTIVE_KEY_NOT_FOUND');
  const p=isRecord(body)?body:{}; const maxBytes=typeof p.maxBytes==='number'?p.maxBytes:64*1024;
  const chunks=ctx.witness.transport.exportChunks(maxBytes);
  return { mode:'local-utility', bundleId:chunks[0]?.bundleId??null, chunks, total:chunks.length };
});

witnessRouter.add('POST','/api/v1/witness/import', async (req,_res,_params,body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'COMMAND'); if(!authz.ok) return authz.error;
  const p=isRecord(body)?body:{}; if(!Array.isArray(p.chunks)) return httpError(400,'WITNESS_CHUNKS_REQUIRED');
  const result=ctx.witness.transport.importChunks(p.chunks,typeof p.trustedPublicKey==='string'?p.trustedPublicKey:undefined);
  await ctx.witness.dagStore.save(ctx.witness.dag);
  if(ctx.witness.store){ for(const node of ctx.witness.dag.list()) await ctx.witness.store.putNode(node); }
  return { status:'IMPORTED', mode:'local-utility', ...result };
});

witnessRouter.add('POST','/api/v1/witness/import/async', async (req,_res,_params,body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'COMMAND'); if(!authz.ok) return authz.error;
  const p=isRecord(body)?body:{}; if(!Array.isArray(p.chunks)) return httpError(400,'WITNESS_CHUNKS_REQUIRED');
  const job=await ctx.jobs.enqueue('WITNESS_IMPORT_CHUNKS',{ chunks:p.chunks, trustedPublicKey:typeof p.trustedPublicKey==='string'?p.trustedPublicKey:undefined, actorId:authz.user?.userId??'SERVICE-API-001' });
  return { statusCode:202, body:{ status:'QUEUED', mode:'local-utility', jobId:job.id } };
});


witnessRouter.add('GET','/api/v1/witness/metrics', async (req,_res,_params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'READ_AUDIT'); if(!authz.ok) return authz.error;
  return { mode:'single-node', ...ctx.witness.metrics.snapshot() };
});

witnessRouter.add('GET','/api/v1/witness/diagnostics', async (req,_res,_params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'READ_AUDIT'); if(!authz.ok) return authz.error;
  return await ctx.witness.diagnostics();
});

witnessRouter.add('POST','/api/v1/witness/backups', async (req,_res,_params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'ADMIN'); if(!authz.ok) return authz.error;
  const backup=await ctx.witness.createBackup();
  return { status:'CREATED', backupId:backup.manifest.backupId, createdAt:backup.manifest.createdAt, root:backup.manifest.qdagRoot, nodeCount:backup.manifest.nodeCount, passwordIncluded:false };
});

witnessRouter.add('GET','/api/v1/witness/backups', async (req,_res,_params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'READ_AUDIT'); if(!authz.ok) return authz.error;
  const backups=await ctx.witness.backups.list();
  return { backups:backups.map((x:any)=>({ backupId:x.manifest.backupId, createdAt:x.manifest.createdAt, root:x.manifest.qdagRoot, nodeCount:x.manifest.nodeCount, files:x.manifest.files, passwordIncluded:x.manifest.passwordIncluded })) };
});

witnessRouter.add('GET','/api/v1/witness/backups/:backupId/verify', async (req,_res,params,_body,_query,ctx)=>{
  const authz=await requirePermission(req,ctx.auth,'READ_AUDIT'); if(!authz.ok) return authz.error;
  const backups=await ctx.witness.backups.list(); const found=backups.find((x:any)=>x.manifest.backupId===params.backupId);
  if(!found) return httpError(404,'WITNESS_BACKUP_NOT_FOUND');
  return await ctx.witness.backups.verify(found.directory);
});
