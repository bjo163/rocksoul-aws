export type PersistenceDriver = 'memory' | 'file' | 'sqlite' | 'postgres';

export interface AuditFields {
  createdAt?: string;
  createdBy?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
  version?: number;
}

export interface AuditRecord {
  auditId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  modelType: string;
  recordId: string;
  actorId: string;
  timestamp: string;
  changedFields: string[];
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  correlationId?: string | null;
  reason?: string | null;
  previousHash?: string;
  hash?: string;
}

export interface EntityRecord extends AuditFields {
  id: string;
  type: string;
  version?: number;
  payload: Record<string, unknown>;
  updatedAt?: string;
}

export interface RelationRecord extends AuditFields {
  id: string;
  fromId: string;
  type: string;
  toId: string;
  validFrom?: string | null;
  validTo?: string | null;
  payload?: Record<string, unknown>;
}

export interface EventRecord extends AuditFields {
  eventId: string;
  entityId: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt?: string;
  recordedAt?: string;
  previousHash?: string;
  eventHash?: string;
  actorId?: string | null;
  deviceId?: string | null;
  source?: string | null;
  signature?: string | null;
}

export interface EvidenceRecord extends AuditFields {
  evidenceId: string;
  entityId: string;
  sourceType: string;
  reference?: string;
  status?: 'OBSERVED' | 'SUPPORTED' | 'VERIFIED' | 'CORROBORATED' | 'INFERRED' | 'UNKNOWN' | 'CONFLICTED';
  confidence?: number;
  payload: Record<string, unknown>;
  createdAt?: string;
}

export interface SystemTraceRecord {
  requestId: string;
  correlationId: string;
  route: string;
  statusCode?: number;
  durationMs?: number;
  error?: string | null;
  startedAt: string;
  completedAt?: string;
}

export interface TraceRepository {
  put(trace: SystemTraceRecord): Promise<void>;
  list(limit?: number): Promise<SystemTraceRecord[]>;
}

export interface ProjectionRecord extends AuditFields {
  projectionId: string;
  entityId: string;
  projectionType: string;
  version?: number;
  payload: Record<string, unknown>;
  updatedAt?: string;
}

export interface ChainVerification {
  valid: boolean;
  events: number;
  head: string | null;
  failedEventId?: string;
  reason?: string;
}

export interface EntityRepository {
  put(entity: EntityRecord): Promise<EntityRecord>;
  get(id: string): Promise<EntityRecord | null>;
  list(type?: string): Promise<EntityRecord[]>;
}

export interface RelationRepository {
  put(relation: RelationRecord): Promise<RelationRecord>;
  listByEntity(entityId: string): Promise<RelationRecord[]>;
}

export interface EventStore {
  append(event: EventRecord): Promise<EventRecord>;
  get(eventId: string): Promise<EventRecord | null>;
  listByEntity(entityId: string): Promise<EventRecord[]>;
  listAll(): Promise<EventRecord[]>;
  
  verifyChain(): Promise<ChainVerification>;
}

export interface EvidenceRepository {
  put(evidence: EvidenceRecord): Promise<EvidenceRecord>;
  get(evidenceId: string): Promise<EvidenceRecord | null>;
  listByEntity(entityId: string): Promise<EvidenceRecord[]>;
}

export interface ProjectionStore {
  upsert(projection: ProjectionRecord): Promise<ProjectionRecord>;
  get(entityId: string, projectionType: string): Promise<ProjectionRecord | null>;
}

export interface AuditStore {
  append(record: AuditRecord): Promise<AuditRecord>;
  listByRecord(recordId: string): Promise<AuditRecord[]>;
  listAll(): Promise<AuditRecord[]>;
  verify(): Promise<{ valid: boolean; count: number; head: string | null }>;
}

export interface SystemJobRecord {
  id: string;
  type: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  payload_json: string;
  result_json?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface JobRepository {
  put(job: SystemJobRecord): Promise<void>;
  get(id: string): Promise<SystemJobRecord | null>;
  list(status?: string): Promise<SystemJobRecord[]>;
  processAvailable(maxJobs: number, processor: (job: SystemJobRecord) => Promise<SystemJobRecord>): Promise<SystemJobRecord[]>;
}

export interface PersistenceStore {
  batch?<T>(work: () => Promise<T> | T): Promise<T>;
  ready?(): Promise<void>;
  driver?: PersistenceDriver;
  entityRepository(): EntityRepository;
  relationRepository(): RelationRepository;
  eventStore(): EventStore;
  evidenceRepository(): EvidenceRepository;
  auditStore(): AuditStore;
  projectionStore(): ProjectionStore;
  traceRepository(): TraceRepository;
  jobRepository(): JobRepository;
  begin(options?: { serializable?: boolean }): Promise<PersistenceStore>;
  close(): Promise<void> | void;
}

export interface PersistenceConfig {
  driver?: PersistenceDriver;
  fileDir?: string;
  sqliteFile?: string;
  postgres?: Record<string, unknown>;
  auditActorId?: string;
  correlationId?: string;
}


export interface TransactionContext {
  db: unknown;
}

export type TransactionWork<T> = (context: TransactionContext) => Promise<T> | T;
