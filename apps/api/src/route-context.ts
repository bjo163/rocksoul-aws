import type { AuthSessionContract, JsonObject } from '../../../packages/contracts/src/index.js';
import type { AuthorizationUser } from '../../../src/security/authorization.js';
import type { UniverseStore } from '../../../src/persistence/universe-store.js';
import type { Observability } from '../../../src/observability/observability.js';
import type { PersistentJobQueue } from '../../../src/jobs/job-queue.js';
import type { SemanticRegistry } from '../../../src/semantic/semantic-registry.js';
import type { createFeatureRegistry } from '../../../src/access/feature-registry.js';
import type { loadLegacyBackend } from './legacy-bridge.js';
import type { PostgresIdempotencyStore } from '../../../src/persistence/postgres-idempotency.js';
import type { IdempotencyStore } from '../../../src/persistence/idempotency.js';
import type { createDefaultSemanticProvider } from '../../../src/ai/provider.js';
import type { WitnessTransportService } from '../../../src/ledger/witness-transport.js';
import type { WitnessDag } from '../../../src/ledger/witness-dag.js';
import type { LocalWitnessDagStore } from '../../../src/ledger/local-dag-store.js';
import type { PostgresWitnessProjectionStore } from '../../../src/ledger/witness-projection-store.js';
import type { SingleNodeWitnessKeyStore } from '../../../src/ledger/single-node-keystore.js';
import type { LocalCheckpointStore } from '../../../src/ledger/local-checkpoint-store.js';
import type { WitnessBackupManager } from '../../../src/ledger/witness-backup.js';
import type { WitnessObservability } from '../../../src/ledger/witness-observability.js';

export interface Authenticator {
  authenticate(token: string): Promise<AuthorizationUser | null>;
  login(username: string, password: string): Promise<AuthSessionContract | null>;
  refresh(refreshToken: string): Promise<AuthSessionContract | null>;
  logout(token: string): Promise<boolean>;
  createUser(input: { username: string; password: string; rid?: string; roles: string[] }): Promise<AuthorizationUser>;
  assignRid(userId: string, rid: string): Promise<AuthorizationUser>;
  getOnlineUsers(): Promise<unknown[]>;
}

export interface WitnessNodeInput {
  recordId?: string;
  nodeId?: string;
  kind: string;
  payload: unknown;
  parents?: string[];
  occurredAt?: string;
  actorId?: string | null;
  nonce?: string;
}

export interface WitnessCheckpointReference {
  checkpointId?: string;
  [key: string]: unknown;
}

export interface WitnessCommitResult {
  node: ReturnType<WitnessDag['append']>;
  checkpoint: WitnessCheckpointReference | null;
  root: string | null;
}

export interface WitnessBackupReference {
  backupId: string;
  filePath: string;
  dagRoot: string | null;
  nodeCount: number;
  [key: string]: unknown;
}

export interface WitnessRouteContext {
  dag: WitnessDag;
  dagStore: LocalWitnessDagStore;
  readonly identity: unknown;
  transport: WitnessTransportService;
  store: PostgresWitnessProjectionStore | null;
  keyStore: SingleNodeWitnessKeyStore;
  checkpoints: LocalCheckpointStore;
  backups: WitnessBackupManager;
  metrics: WitnessObservability;
  dataDir: string;
  keyPasswordSource: string;
  refreshTransportIdentity(): Promise<unknown>;
  persistKeys(): Promise<void>;
  appendMizan(input: WitnessNodeInput): Promise<ReturnType<WitnessDag['append']>>;
  commitMizan(input: WitnessNodeInput): Promise<WitnessCommitResult>;
  commit(input: WitnessNodeInput): Promise<WitnessCommitResult>;
  createCheckpoint(at?: string): Promise<WitnessCheckpointReference>;
  createBackup(at?: string): Promise<WitnessBackupReference>;
  diagnostics(): Promise<unknown>;
}

export type RouteIdempotency = IdempotencyStore | PostgresIdempotencyStore;
export type FeatureRegistry = ReturnType<typeof createFeatureRegistry>;
export type LegacyBackend = Awaited<ReturnType<typeof loadLegacyBackend>>;
export type SemanticProvider = ReturnType<typeof createDefaultSemanticProvider>;

export interface RouteContext {
  backend: LegacyBackend;
  universeStore: UniverseStore;
  observability: Observability;
  auth: Authenticator;
  features: FeatureRegistry;
  idempotency: RouteIdempotency;
  jobs: PersistentJobQueue;
  semanticRegistry: SemanticRegistry;
  semanticProvider: SemanticProvider;
  witness: WitnessRouteContext;
}
