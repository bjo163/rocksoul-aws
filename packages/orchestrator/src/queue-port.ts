/**
 * Host-neutral job queue contracts.
 *
 * Adapters may persist jobs in a database, a file store, or an external
 * broker. Workflow packages depend on these contracts rather than on a
 * concrete persistence client or timer implementation.
 */

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

/** Queue operations required by workflow and ingress adapters. */
export interface JobQueuePort {
  enqueue<T>(type: string, payload: T): Promise<JobRecord<T>>;
  get(id: string): Promise<JobRecord | null>;
  list(status?: JobStatus): Promise<JobRecord[]>;
  register<T, R>(type: string, handler: JobHandler<T, R>): void;
  processAvailable(maxJobs?: number): Promise<JobRecord[]>;
}

/** Lifecycle operations are kept separate so hosts can own worker startup. */
export interface JobQueueLifecyclePort {
  start(): void;
  stop(): void;
}

export type WorkerQueuePort = JobQueuePort & JobQueueLifecyclePort;

export function isTerminalJobStatus(status: JobStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED';
}

