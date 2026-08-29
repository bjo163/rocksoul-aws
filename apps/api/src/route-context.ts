import type { AuthSessionContract } from '@moonwitness/contracts';
import type { AuthorizationUser, createFeatureRegistry } from '@moonwitness/security';
import type { UniverseStore } from '@moonwitness/persistence';
import type { Observability } from '@moonwitness/observability';
import type { PersistentJobQueue } from '@moonwitness/jobs';
import type { SemanticRegistry } from '@moonwitness/semantic-engine';
import type { loadLegacyBackend } from './legacy-bridge.js';
import type {
  LocalCheckpointStore,
  LocalWitnessDagStore,
  PostgresWitnessProjectionStore,
  SingleNodeWitnessKeyStore,
  WitnessBackupManager,
  WitnessDag,
  WitnessObservability,
  WitnessTransportService,
} from '@moonwitness/witness';
import { createDefaultSemanticProvider } from '@moonwitness/cosmic-engine';

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
  recordType?: string;
  nodeId?: string;
  kind?: string;
  payload?: unknown;
  [key: string]: unknown;
  parents?: string[];
  occurredAt?: string;
  actorId?: string | null;
  nonce?: string;
}

export interface WitnessCheckpointReference {
  checkpointId?: string;
  checkpoint: { checkpointId: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface WitnessCommitResult {
  node: ReturnType<WitnessDag['append']>;
  checkpoint: WitnessCheckpointReference | null;
  root: string | null;
}

export interface WitnessBackupReference {
  backupId?: string;
  filePath?: string;
  dagRoot?: string | null;
  nodeCount?: number;
  manifest: {
    backupId: string;
    createdAt: string;
    qdagRoot: string | null;
    nodeCount: number;
    files: string[];
    passwordIncluded: boolean;
    [key: string]: unknown;
  };
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

export interface RouteIdempotency {
  execute(key: string | null, requestHash: string, work: () => Promise<{ statusCode: number; body: unknown }>): Promise<{ statusCode: number; body: unknown }>;
  close(): Promise<void>;
}

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
