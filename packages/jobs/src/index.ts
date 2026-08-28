import crypto from 'node:crypto';
import type { PersistenceStore, SystemJobRecord } from '@moonwitness/persistence';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';

export interface JobRecord<T = unknown, R = unknown> {
  id: string;
  type: string;
  status: JobStatus;
  payload: T;
  result?: R;
  error?: string;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  maxAttempts: number;
  availableAt: string;
  leaseOwner?: string;
  leaseExpiresAt?: string;
  idempotencyKey?: string;
}

export type JobHandler<T = unknown, R = unknown> = (payload: T) => Promise<R>;

export interface JobQueuePort {
  enqueue<T>(type: string, payload: T, idempotencyKey?: string): Promise<JobRecord<T>>;
  get(id: string): Promise<JobRecord | null>;
  list(status?: JobStatus): Promise<JobRecord[]>;
  register<T, R>(type: string, handler: JobHandler<T, R>): void;
  processAvailable(maxJobs?: number): Promise<JobRecord[]>;
}

export interface JobQueueLifecyclePort {
  start(): void;
  stop(): void;
}

export type WorkerQueuePort = JobQueuePort & JobQueueLifecyclePort;

export function isTerminalJobStatus(status: JobStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'DEAD_LETTER';
}

function toJobRecord<T, R>(systemJob: SystemJobRecord): JobRecord<T, R> {
  return {
    id: systemJob.id,
    type: systemJob.type,
    status: systemJob.status as JobStatus,
    payload: JSON.parse(systemJob.payload_json),
    result: systemJob.result_json ? JSON.parse(systemJob.result_json) : undefined,
    error: systemJob.error_message,
    createdAt: systemJob.created_at,
    updatedAt: systemJob.updated_at,
    attemptCount: systemJob.attempt_count ?? 0,
    maxAttempts: systemJob.max_attempts ?? 3,
    availableAt: systemJob.available_at ?? systemJob.created_at,
    leaseOwner: systemJob.lease_owner,
    leaseExpiresAt: systemJob.lease_expires_at,
    idempotencyKey: systemJob.idempotency_key,
  };
}

/** Persistence-backed queue with explicit handler registration and polling lifecycle. */
export class PersistentJobQueue implements WorkerQueuePort {
  private handlers = new Map<string, JobHandler>();
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  readonly workerId: string;
  constructor(
    private readonly store: PersistenceStore,
    private readonly pollIntervalMs = 5000,
    private readonly options: { workerId?: string; leaseMs?: number; maxAttempts?: number; retryBaseMs?: number; now?: () => Date } = {},
  ) { this.workerId = options.workerId ?? `worker-${crypto.randomUUID()}`; }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = async () => {
      if (!this.isRunning) return;
      try { await this.processAvailable(8); } catch (error) { console.error('[JOB QUEUE] Worker error:', error); }
      if (this.isRunning) this.timer = setTimeout(loop, this.pollIntervalMs);
    };
    this.timer = setTimeout(loop, 0);
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  register<T, R>(type: string, handler: JobHandler<T, R>): void {
    this.handlers.set(type, handler as JobHandler);
  }

  async enqueue<T>(type: string, payload: T, idempotencyKey?: string): Promise<JobRecord<T>> {
    const now = this.now().toISOString();
    const id = idempotencyKey ? `JOB-${crypto.createHash('sha256').update(`${type}:${idempotencyKey}`).digest('hex').slice(0, 32)}` : `JOB-${crypto.randomUUID()}`;
    const existing = idempotencyKey ? await this.store.jobRepository().get(id) : null;
    if (existing) return toJobRecord<T, never>(existing);
    const job: SystemJobRecord = {
      id,
      type,
      status: 'QUEUED',
      payload_json: JSON.stringify(payload),
      created_at: now,
      updated_at: now,
      attempt_count: 0, max_attempts: this.maxAttempts, available_at: now, idempotency_key: idempotencyKey,
    };
    await this.store.jobRepository().put(job);
    return toJobRecord<T, never>(job);
  }

  async get(id: string): Promise<JobRecord | null> {
    const job = await this.store.jobRepository().get(id);
    return job ? toJobRecord(job) : null;
  }

  async list(status?: JobStatus): Promise<JobRecord[]> {
    return (await this.store.jobRepository().list(status)).map((job) => toJobRecord(job));
  }

  async processAvailable(maxJobs = 8): Promise<JobRecord[]> {
    const repo = this.store.jobRepository();
    if (!repo.claimAvailable || !repo.resolveLease) {
      const completed = await repo.processAvailable(maxJobs, async (job) => this.run(job));
      return completed.map((job) => toJobRecord(job));
    }
    const now = this.now(); const claims = await repo.claimAvailable(maxJobs, this.workerId, new Date(now.getTime() + this.leaseMs).toISOString(), now.toISOString());
    const settled: SystemJobRecord[] = [];
    for (const job of claims) { const result = await this.run(job); if (await repo.resolveLease(job.id, this.workerId, result)) settled.push(result); }
    return settled.map((job) => toJobRecord(job));
  }

  private get maxAttempts() { const n = this.options.maxAttempts ?? 3; return Number.isInteger(n) && n > 0 ? n : 3; }
  private get leaseMs() { const n = this.options.leaseMs ?? 30_000; return Number.isInteger(n) && n > 0 ? n : 30_000; }
  private now() { return this.options.now?.() ?? new Date(); }
  private async run(job: SystemJobRecord): Promise<SystemJobRecord> {
    const at = (job.attempt_count ?? 0) + 1; const now = this.now();
    try { const handler = this.handlers.get(job.type); if (!handler) throw new Error(`NO_HANDLER:${job.type}`); const result = await handler(JSON.parse(job.payload_json)); return { ...job, status: 'COMPLETED', result_json: JSON.stringify(result ?? null), error_message: undefined, updated_at: now.toISOString(), attempt_count: at, lease_owner: undefined, lease_expires_at: undefined }; }
    catch (error) { const message = error instanceof Error ? error.message : String(error); const terminal = at >= (job.max_attempts ?? this.maxAttempts); return { ...job, status: terminal ? 'DEAD_LETTER' : 'QUEUED', error_message: message, updated_at: now.toISOString(), attempt_count: at, available_at: terminal ? job.available_at : new Date(now.getTime() + (this.options.retryBaseMs ?? 1000) * 2 ** (at - 1)).toISOString(), lease_owner: undefined, lease_expires_at: undefined }; }
  }
}

export interface WorkerRuntimeOptions { drainTimeoutMs?: number; }

/** Owns worker lifecycle without owning application business logic. */
export class WorkerRuntime {
  private started = false;
  private stopping = false;

  constructor(private readonly queue: JobQueueLifecyclePort, private readonly options: WorkerRuntimeOptions = {}) {}

  start(): void {
    if (this.started || this.stopping) return;
    this.started = true;
    this.queue.start();
  }

  async stop(): Promise<void> {
    if (!this.started || this.stopping) return;
    this.stopping = true;
    this.queue.stop();
    this.started = false;
  }

  get isStarted(): boolean { return this.started && !this.stopping; }
  get drainTimeoutMs(): number {
    const configured = this.options.drainTimeoutMs ?? 30_000;
    return Number.isInteger(configured) && configured > 0 ? configured : 30_000;
  }
}
