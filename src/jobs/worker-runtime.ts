import type { PersistentJobQueue } from './job-queue.js';

export interface WorkerRuntimeOptions {
  drainTimeoutMs?: number;
}

/** Owns worker lifecycle without owning application business logic. */
export class WorkerRuntime {
  private started = false;
  private stopping = false;

  constructor(
    private readonly queue: PersistentJobQueue,
    private readonly options: WorkerRuntimeOptions = {},
  ) {}

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

  get isStarted(): boolean {
    return this.started && !this.stopping;
  }

  get drainTimeoutMs(): number {
    const configured = this.options.drainTimeoutMs ?? 30_000;
    return Number.isInteger(configured) && configured > 0 ? configured : 30_000;
  }
}
