import crypto from 'node:crypto';
import type { PersistenceStore, SystemJobRecord } from '../../packages/persistence/src/types.js';

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

export class PersistentJobQueue {
  private readonly store: PersistenceStore;
  private handlers = new Map<string, JobHandler>();
  private pollIntervalMs: number;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(store: PersistenceStore, pollIntervalMs = 5000) {
    this.store = store;
    this.pollIntervalMs = pollIntervalMs;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = async () => {
      if (!this.isRunning) return;
      try { await this.processAvailable(8); } catch (err) { console.error('[JOB QUEUE] Worker error:', err); }
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
    return toJobRecord(job);
  }

  async get(id: string): Promise<JobRecord | null> {
    const job = await this.store.jobRepository().get(id);
    return job ? toJobRecord(job) : null;
  }

  async list(status?: JobStatus): Promise<JobRecord[]> {
    const jobs = await this.store.jobRepository().list(status);
    return jobs.map(j => toJobRecord(j));
  }

  async processAvailable(maxJobs = 8): Promise<JobRecord[]> {
    const completed = await this.store.jobRepository().processAvailable(maxJobs, async (job) => {
      const handler = this.handlers.get(job.type);
      if (!handler) throw new Error(`NO_HANDLER:${job.type}`);
      const payload = JSON.parse(job.payload_json);
      const result = await handler(payload);
      return {
        ...job,
        status: 'COMPLETED',
        result_json: JSON.stringify(result ?? null),
        updated_at: new Date().toISOString(),
      };
    });
    return completed.map(j => toJobRecord(j));
  }
}
