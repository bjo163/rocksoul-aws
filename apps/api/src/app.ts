import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLegacyBackend } from './legacy-bridge.js';
import * as authFactory from '../../../src/access/auth.js';
import * as featureFactory from '../../../src/access/feature-registry.js';
import { buildAiAnalysis, analyzeWithProvider } from '../../../src/ai/general-analyzer.js';
import { createDefaultSemanticProvider } from '../../../src/ai/provider.js';
import { UniverseStore } from '../../../src/persistence/universe-store.js';
import { Observability } from '../../../src/observability/observability.js';
import { assertPermission, hasPermission, type ActionPermission } from '../../../src/security/authorization.js';
import { IdempotencyStore } from '../../../src/persistence/idempotency.js';
import { PostgresIdempotencyStore } from '../../../src/persistence/postgres-idempotency.js';
import { PostgresAuthService } from '../../../src/access/postgres-auth.js';
import { PersistentJobQueue } from '../../../src/jobs/job-queue.js';
import { SemanticRegistry } from '../../../src/semantic/semantic-registry.js';
import { initializeRuntimeData, runtimeDataset } from '../../../src/persistence/runtime-data.js';
import { replayCaseEvents } from '../../../src/audit/event-replay.js';
import { composeReminderBundle } from '../../../src/ingress/revelation-reminder-engine.js';
import { createUnpredictableIngress, triggerIngress } from '../../../src/ingress/divine-ingress.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export interface AppOptions { dataDir?: string; persistenceDriver?: 'file' | 'postgres'; }
export interface HttpApp { handler: (request: IncomingMessage, response: ServerResponse) => Promise<void>; start: (port: number, host: string) => Promise<void>; close: () => Promise<void>; server: Server; }

import { loadDatabaseConfig } from '../../../src/config-loader.js';
import { Router, writeJson, isHttpError, isStatusBody, readJsonBody, HttpBodyError } from './router.js';
import { authRouter } from './routes/auth.routes.js';
import { kernelRouter } from './routes/kernel.routes.js';
import { entitiesRouter } from './routes/entities.routes.js';
import { v1Router } from './routes/v1.routes.js';
import { witnessRouter } from './routes/witness.routes.js';
import { WitnessDag } from '../../../src/ledger/witness-dag.js';
import { signCheckpoint } from '../../../src/ledger/distributed-witness.js';
import { WitnessTransportService } from '../../../src/ledger/witness-transport.js';
import { PostgresWitnessProjectionStore } from '../../../src/ledger/witness-projection-store.js';
import { SingleNodeWitnessKeyStore, resolveSingleNodeWitnessPassword } from '../../../src/ledger/single-node-keystore.js';
import { LocalCheckpointStore } from '../../../src/ledger/local-checkpoint-store.js';
import { WitnessBackupManager } from '../../../src/ledger/witness-backup.js';
import { WitnessObservability } from '../../../src/ledger/witness-observability.js';
import { runWitnessDiagnostics } from '../../../src/ledger/witness-diagnostics.js';
import { appendMizanWitness } from '../../../src/ledger/witness-mizan.js';
import { LocalWitnessDagStore } from '../../../src/ledger/local-dag-store.js';
import { assertApiResponseContract, ContractValidationError } from '../../../packages/contracts/src/index.js';
import { runAiAnalyzeWorkflow } from '@moonwitness/orchestrator';

export async function buildApp(options: AppOptions = {}): Promise<HttpApp> {
  const cookieSameSite = process.env.MW_COOKIE_SAME_SITE ?? 'Lax';
  if (!['Lax', 'Strict', 'None'].includes(cookieSameSite)) throw new Error('MW_COOKIE_SAME_SITE_INVALID');
  if (cookieSameSite === 'None' && process.env.NODE_ENV !== 'production' && process.env.MW_COOKIE_SECURE !== '1') throw new Error('MW_COOKIE_SAME_SITE_NONE_REQUIRES_SECURE');
  const yamlConfig = loadDatabaseConfig(path.resolve(here, '../../../'));
  const dataDir = options.dataDir ?? path.resolve(process.env.MOONWITNESS_DATA_DIR ?? '.data');
  const persistenceDriver = options.persistenceDriver ?? (process.env.STORAGE_DRIVER as 'file' | 'postgres' | undefined) ?? yamlConfig.storage?.driver ?? 'file';
  if (persistenceDriver !== 'file' && persistenceDriver !== 'postgres') throw new Error(`Unsupported STORAGE_DRIVER: ${persistenceDriver}. Supported drivers: file, postgres`);
  const universeStore = new UniverseStore({ dataDir: path.join(dataDir, 'universe'), driver: persistenceDriver, postgres: yamlConfig.storage?.postgres });
  await universeStore.persistence.ready();
  await initializeRuntimeData(universeStore.persistence.entities(), { postgres: persistenceDriver === 'postgres' });
  const backend = await loadLegacyBackend(dataDir, universeStore.persistence);
  const observability = new Observability(universeStore.persistence.store);
  const jwtSecret = process.env.JWT_SECRET || 'moonwitness-development-secret-12345';
  if (process.env.NODE_ENV === 'production' && (jwtSecret === 'moonwitness-development-secret-12345' || jwtSecret.length < 32)) throw new Error('JWT_SECRET_MUST_BE_32_CHARS_AND_NON_DEFAULT_IN_PRODUCTION');
  const auth = persistenceDriver === 'postgres' ? await PostgresAuthService.create({ jwtSecret }) : authFactory.createAuthService({ storagePath: path.join(dataDir, 'auth-users.json'), jwtSecret });
  const features = featureFactory.createFeatureRegistry();
  const idempotency = persistenceDriver === 'postgres' ? new PostgresIdempotencyStore() : new IdempotencyStore(path.join(dataDir, 'idempotency.json'));
  const jobs = new PersistentJobQueue(universeStore.persistence.store);
  const semanticRegistry = new SemanticRegistry(runtimeDataset('data/semantic/registry.json')?.definitions ?? {});
  const semanticProvider = createDefaultSemanticProvider(path.resolve(here, '../../..'));
  const witnessDag = new WitnessDag();
  const witnessDagStore = await LocalWitnessDagStore.open(path.join(dataDir, 'witness', 'qdag.json'));
  const localDagHydration = await witnessDagStore.hydrate(witnessDag);
  const witnessId = process.env.WITNESS_ID || 'SERVICE-WITNESS-001';
  const witnessPassword = await resolveSingleNodeWitnessPassword({ dataDir, explicitPassword: process.env.WITNESS_KEY_PASSWORD, production: process.env.NODE_ENV === 'production' });
  const witnessKeyStore = await SingleNodeWitnessKeyStore.open({ filePath: path.join(dataDir, 'witness', 'keystore.json.enc'), witnessId, password: witnessPassword.password });
  const witnessCheckpointStore = await LocalCheckpointStore.open(path.join(dataDir, 'witness', 'checkpoints.json'));
  const witnessMetrics = new WitnessObservability();
  const witnessBackups = new WitnessBackupManager({ dataDir, dag: witnessDag, witnessId });
  const witnessStore = persistenceDriver === 'postgres' ? new PostgresWitnessProjectionStore() : null;
  if (witnessStore) {
    try {
      if (localDagHydration.loaded === 0) for (const node of await witnessStore.loadNodes()) witnessDag.import(node);
      for (const node of witnessDag.list()) await witnessStore.putNode(node);
      for (const key of witnessKeyStore.list()) await witnessStore.putKey(key);
    } catch (error) { console.warn('[witness] projection synchronization skipped:', error instanceof Error ? error.message : String(error)); }
  }
  await witnessDagStore.save(witnessDag);
  const initialWitnessIdentity = witnessKeyStore.activeIdentity();
  const witnessTransport = new WitnessTransportService(witnessDag, initialWitnessIdentity);
  jobs.register('WITNESS_IMPORT_CHUNKS', async (payload: Record<string, unknown>) => {
    if (!Array.isArray(payload.chunks)) throw new Error('WITNESS_CHUNKS_REQUIRED');
    const result = witnessTransport.importChunks(payload.chunks as any, typeof payload.trustedPublicKey === 'string' ? payload.trustedPublicKey : undefined);
    if (witnessStore) for (const node of witnessDag.list()) await witnessStore.putNode(node);
    await witnessDagStore.save(witnessDag);
    return result;
  });
  jobs.register('AI_ANALYZE', async (payload: Record<string, unknown>) => {
    const text = typeof payload.text === 'string' ? payload.text : '';
    const caseId = typeof payload.caseId === 'string' ? payload.caseId : `CASE-${randomUUID()}`;
    const aiOpts = typeof payload.options === 'object' && payload.options ? { ...payload.options } : {};
    const actorId = typeof payload.actorId === 'string' ? payload.actorId : 'SERVICE-WORKER-001';
    const workflow = await runAiAnalyzeWorkflow({ caseId, actorId, text, options: aiOpts, semanticObservation: payload.semanticObservation && typeof payload.semanticObservation === 'object' ? payload.semanticObservation as Record<string, unknown> : undefined, modelVersion: process.env.MOONWITNESS_RELEASE_VERSION ?? '4.33.0', source: 'persistent-job' }, {
      listEvidence: (id) => universeStore.listCaseEvidence(id),
      analyze: async ({ text: analysisText, options, semanticObservation }) => {
        const enriched = { ...options, provider: semanticProvider, sourceGraph: { search: ({ q, limit = 10 }: { q: string; limit?: number }) => backend.runtime.graph.listEntities({ q }).slice(0, limit).map((e: any) => ({ ...e, id: e.entityId })) } };
        return semanticObservation ? buildAiAnalysis(analysisText, enriched as any) : analyzeWithProvider(analysisText, enriched as any);
      },
      composeReminder: (seed) => composeReminderBundle(seed),
      saveCase: ({ aggregate, eventType, actorId: saveActor }) => universeStore.saveCase(aggregate as any, eventType, saveActor),
      commitWitness: async (input) => {
        const node = appendMizanWitness(witnessDag, input as any);
        await witnessDagStore.save(witnessDag); if (witnessStore) await witnessStore.putNode(node); witnessMetrics.record('NODE_APPENDED');
        let checkpointId: string | null = null;
        if (process.env.WITNESS_AUTO_CHECKPOINT !== '0' && witnessKeyStore.activeIdentity()) { const signed=signCheckpoint(witnessDag.checkpoint(),witnessKeyStore.activeIdentity()!); await witnessCheckpointStore.put(signed); if(witnessStore) await witnessStore.putCheckpoint(signed); witnessMetrics.record('CHECKPOINT_CREATED'); checkpointId = signed.checkpoint.checkpointId; }
        return { node: { nodeId: node.nodeId, hash: node.hash }, root: witnessDag.root(), checkpointId };
      },
    });
    return workflow;
  });
  jobs.start();

  const ctx = { backend, universeStore, observability, auth, features, idempotency, jobs, semanticRegistry, semanticProvider, witness: { dag: witnessDag, dagStore: witnessDagStore, get identity() { return witnessKeyStore.activeIdentity(); }, transport: witnessTransport, store: witnessStore, keyStore: witnessKeyStore, checkpoints: witnessCheckpointStore, backups: witnessBackups, metrics: witnessMetrics, dataDir, keyPasswordSource: witnessPassword.source, async refreshTransportIdentity() { const active=witnessKeyStore.activeIdentity(); if(!active) throw new Error('WITNESS_ACTIVE_KEY_NOT_FOUND'); witnessTransport.setIdentity(active); return active; }, async persistKeys() { if(witnessStore) for(const key of witnessKeyStore.list()) await witnessStore.putKey(key); }, async appendMizan(input:any) { const node=appendMizanWitness(witnessDag,input); await witnessDagStore.save(witnessDag); if(witnessStore) await witnessStore.putNode(node); witnessMetrics.record('NODE_APPENDED'); return node; }, async commitMizan(input:any) { const node=appendMizanWitness(witnessDag,input); await witnessDagStore.save(witnessDag); if(witnessStore) await witnessStore.putNode(node); witnessMetrics.record('NODE_APPENDED'); let checkpoint=null; if(process.env.WITNESS_AUTO_CHECKPOINT!=='0' && witnessKeyStore.activeIdentity()){ const active=witnessKeyStore.activeIdentity()!; checkpoint=signCheckpoint(witnessDag.checkpoint(),active); await witnessCheckpointStore.put(checkpoint); if(witnessStore) await witnessStore.putCheckpoint(checkpoint); witnessMetrics.record('CHECKPOINT_CREATED'); } return { node, checkpoint, root:witnessDag.root() }; }, async commit(input:{ nodeId?:string; kind:string; payload:Record<string,unknown>; actorId?:string|null }) { const node=witnessDag.append(input); await witnessDagStore.save(witnessDag); if(witnessStore) await witnessStore.putNode(node); witnessMetrics.record('NODE_APPENDED'); let checkpoint=null; if(process.env.WITNESS_AUTO_CHECKPOINT!=='0' && witnessKeyStore.activeIdentity()){ const active=witnessKeyStore.activeIdentity()!; checkpoint=signCheckpoint(witnessDag.checkpoint(),active); await witnessCheckpointStore.put(checkpoint); if(witnessStore) await witnessStore.putCheckpoint(checkpoint); witnessMetrics.record('CHECKPOINT_CREATED'); } return { node, checkpoint, root:witnessDag.root() }; }, async createCheckpoint(at?: string) { const active=witnessKeyStore.activeIdentity(); if(!active) throw new Error('WITNESS_ACTIVE_KEY_NOT_FOUND'); const signed=signCheckpoint(witnessDag.checkpoint(at),active); await witnessCheckpointStore.put(signed); if(witnessStore) await witnessStore.putCheckpoint(signed); witnessMetrics.record('CHECKPOINT_CREATED'); return signed; }, async createBackup(at?: string) { const result=await witnessBackups.create(at); witnessMetrics.record('BACKUP_CREATED'); return result; }, async diagnostics() { const result=await runWitnessDiagnostics({ dataDir, dag:witnessDag, keyStore:witnessKeyStore, checkpoints:witnessCheckpointStore, backups:witnessBackups }); witnessMetrics.record('DIAGNOSTIC_RUN'); return result; } } };

  const rootRouter = new Router(); rootRouter.use(authRouter); rootRouter.use(kernelRouter); rootRouter.use(entitiesRouter); rootRouter.use(v1Router); rootRouter.use(witnessRouter);
  const httpServer = createServer((request, response) => { void handleRequest(request, response, rootRouter, ctx); });
  httpServer.requestTimeout = Number(process.env.MW_REQUEST_TIMEOUT_MS ?? 30_000); httpServer.headersTimeout = Number(process.env.MW_HEADERS_TIMEOUT_MS ?? 15_000); httpServer.keepAliveTimeout = Number(process.env.MW_KEEP_ALIVE_TIMEOUT_MS ?? 5_000); httpServer.maxRequestsPerSocket = Number(process.env.MW_MAX_REQUESTS_PER_SOCKET ?? 1_000);
  return { handler: (request, response) => handleRequest(request, response, rootRouter, ctx), server: httpServer, start: (port, host) => new Promise<void>((resolve, reject) => { const onError=(error:Error):void=>{httpServer.off('listening',onListening);reject(error)}; const onListening=():void=>{httpServer.off('error',onError);resolve()}; httpServer.once('error',onError);httpServer.once('listening',onListening);httpServer.listen(port,host)}), close: () => new Promise<void>(async (resolve, reject) => { jobs.stop(); if (!httpServer.listening) { await universeStore.close(); await (idempotency as any).close?.(); await (auth as any).close?.(); await witnessStore?.close?.(); resolve(); return; } httpServer.close(async (error)=>{ if(error){reject(error);return;} try{await universeStore.close();await (idempotency as any).close?.();await (auth as any).close?.();await witnessStore?.close?.();resolve()}catch(error){reject(error)} }); }) };
}

function positiveInteger(value: string | undefined, fallback: number): number { const parsed=Number(value); return Number.isInteger(parsed)&&parsed>0?parsed:fallback; }
const rateLimitMap = new Map<string,{count:number;resetAt:number}>();
function checkRateLimit(ip:string,pathName:string){ const now=Date.now(); const authSensitive=pathName.startsWith('/api/v1/auth/'); const aiSensitive=['/api/v1/ai/analyze','/api/v1/analyze','/api/v1/evaluate'].includes(pathName); const writeSensitive=pathName==='/api/v1/observe'||pathName.startsWith('/api/v1/xrp/')||pathName.startsWith('/api/v1/flow/'); const limit=authSensitive?positiveInteger(process.env.MW_AUTH_RATE_LIMIT_PER_MINUTE,30):aiSensitive?positiveInteger(process.env.MW_AI_RATE_LIMIT_PER_MINUTE,30):writeSensitive?positiveInteger(process.env.MW_WRITE_RATE_LIMIT_PER_MINUTE,120):positiveInteger(process.env.MW_RATE_LIMIT_PER_MINUTE,600); const bucket=authSensitive?'auth':aiSensitive?'ai':writeSensitive?'write':'general'; const key=`${bucket}:${ip}`; const maxBuckets=positiveInteger(process.env.MW_RATE_LIMIT_MAX_BUCKETS,10_000); if(rateLimitMap.size>=maxBuckets){for(const[candidate,value]of rateLimitMap)if(value.resetAt<=now)rateLimitMap.delete(candidate);while(rateLimitMap.size>=maxBuckets){const oldest=rateLimitMap.keys().next().value;if(typeof oldest!=='string')break;rateLimitMap.delete(oldest)}} let record=rateLimitMap.get(key);if(!record||now>record.resetAt){record={count:1,resetAt:now+60_000};rateLimitMap.set(key,record);return{allowed:true,limit,remaining:Math.max(0,limit-1),retryAfter:0}}record.count++;const allowed=record.count<=limit;return{allowed,limit,remaining:Math.max(0,limit-record.count),retryAfter:allowed?0:Math.max(1,Math.ceil((record.resetAt-now)/1000))}; }

async function handleRequest(request: IncomingMessage, response: ServerResponse, router: Router, ctx: any): Promise<void> {
  const start=performance.now(); const requestId=randomUUID(); const method=(request.method??'GET').toUpperCase(); const url=new URL(request.url??'/',`http://${request.headers.host??'127.0.0.1'}`); const forwardedFor=process.env.MW_TRUST_PROXY==='1'&&typeof request.headers['x-forwarded-for']==='string'?request.headers['x-forwarded-for'].split(',')[0]?.trim():''; const clientIp=forwardedFor||request.socket.remoteAddress||'unknown';
  const configuredOrigins=(process.env.MW_CORS_ORIGINS??'').split(',').map(value=>value.trim()).filter(Boolean); const origin=typeof request.headers.origin==='string'?request.headers.origin:''; const allowOrigin=configuredOrigins.length?(configuredOrigins.includes(origin)?origin:''):(process.env.NODE_ENV==='production'?'':'*'); if(allowOrigin)response.setHeader('Access-Control-Allow-Origin',allowOrigin);if(allowOrigin&&allowOrigin!=='*'){response.setHeader('Vary','Origin');response.setHeader('Access-Control-Allow-Credentials','true')}response.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');response.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, Idempotency-Key, X-MW-Auth-Mode');response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('X-Frame-Options','DENY');response.setHeader('Referrer-Policy','no-referrer');response.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");if(process.env.NODE_ENV==='production')response.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');response.setHeader('X-Request-Id',requestId);
  if(process.env.NODE_ENV==='production'&&origin&&!allowOrigin)return writeJson(response,403,{error:'ORIGIN_NOT_ALLOWED',request_id:requestId});if(method==='OPTIONS'){response.statusCode=204;response.end();return;}
  const trace=ctx.observability.start(`${method} ${url.pathname}`,{requestId});response.on('finish',()=>{const durationMs=performance.now()-start;const status=response.statusCode;const color=status>=500?'\x1b[31m':status>=400?'\x1b[33m':'\x1b[32m';const timestamp=new Date().toISOString();console.log(`[${timestamp}] [req-${requestId.slice(0,8)}] ${method} ${url.pathname} ${color}${status}\x1b[0m (${durationMs.toFixed(2)}ms) - IP: ${clientIp}`);ctx.observability.finish(trace,status)});
  const originalWriteHead=response.writeHead.bind(response);(response as any).writeHead=(statusCode:number,...args:any[])=>{if(!response.hasHeader('X-Response-Time'))response.setHeader('X-Response-Time',`${(performance.now()-start).toFixed(2)}ms`);return originalWriteHead(statusCode,...args)};
  const rateLimit=checkRateLimit(clientIp,url.pathname);response.setHeader('X-RateLimit-Limit',String(rateLimit.limit));response.setHeader('X-RateLimit-Remaining',String(rateLimit.remaining));if(!rateLimit.allowed){response.setHeader('Retry-After',String(rateLimit.retryAfter));return writeJson(response,429,{error:'TOO_MANY_REQUESTS',message:'Rate limit exceeded. Try again later.',request_id:requestId})}
  try { const route=router.routes.find(candidate=>candidate.method===method&&candidate.pattern.regex.test(url.pathname));if(!route)return writeJson(response,404,{error:'NOT_FOUND',request_id:requestId});const match=route.pattern.regex.exec(url.pathname);const params:Record<string,string>={};route.paramNames.forEach((name,index)=>{params[name]=decodeURIComponent(match?.[index+1]??'')});const body=await readJsonBody(request);const result=await route.handler(request,response,params,body,url.searchParams,ctx);if(isHttpError(result)){const body={...result.body};if(!body.request_id)body.request_id=requestId;return writeJson(response,result.statusCode,body)}if(isStatusBody(result)){const body={...result.body};if(!body.request_id)body.request_id=requestId;return writeJson(response,result.statusCode,body)}if(result===undefined){if(!response.writableEnded){response.statusCode=204;response.end()}return}if(!response.writableEnded)return writeJson(response,200,{...result,request_id:requestId}) } catch(error){const status=error instanceof HttpBodyError?error.statusCode:500;const publicError=error instanceof HttpBodyError?error.code:'INTERNAL_ERROR';if(!response.writableEnded)writeJson(response,status,{error:publicError,request_id:requestId,...(process.env.NODE_ENV!=='production'&&error instanceof Error?{message:error.message}: {})})}
}
