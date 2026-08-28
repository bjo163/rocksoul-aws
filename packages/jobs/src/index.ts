import crypto from 'node:crypto';
import type { PersistenceStore, SystemJobRecord } from '@moonwitness/persistence';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface JobRecord<T = unknown, R = unknown> {
  id: string;
  type: string;
  status: JobStatus;
  payload: T;
  result?: R;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobHandler<T = unknown, R = unknown> = (payload: T) => Promise<R>;

export interface JobQueuePort {
  enqueue<T>(type: string, payload: T): Promise<JobRecord<T>>;
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
  return status === 'COMPLETED' || status === 'FAILED';
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
  };
}

/** Persistence-backed queue with explicit handler registration and polling lifecycle. */
export class PersistentJobQueue implements WorkerQueuePort {
  private handlers = new Map<string, JobHandler>();
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly store: PersistenceStore,
    private readonly pollIntervalMs = 5000,
  ) {}

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

  async enqueue<T>(type: string, payload: T): Promise<JobRecord<T>> {
    const now = new Date().toISOString();
    const job: SystemJobRecord = {
      id: `JOB-${crypto.randomUUID()}`,
      type,
      status: 'QUEUED',
      payload_json: JSON.stringify(payload),
      created_at: now,
      updated_at: now,
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
    const completed = await this.store.jobRepository().processAvailable(maxJobs, async (job) => {
      const handler = this.handlers.get(job.type);
      if (!handler) throw new Error(`NO_HANDLER:${job.type}`);
      const result = await handler(JSON.parse(job.payload_json));
      return { ...job, status: 'COMPLETED', result_json: JSON.stringify(result ?? null), updated_at: new Date().toISOString() };
    });
    return completed.map((job) => toJobRecord(job));
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
