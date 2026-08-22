import { createUnpredictableIngress, triggerIngress, type IngressPayload } from './divine-ingress.js';

export interface UnpredictableSchedulerOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
  onTriggered: (payload: IngressPayload) => void | Promise<void>;
  channelId?: string;
}

export class UnpredictableIngressScheduler {
  private timer: NodeJS.Timeout | null = null;
  private stopped = true;

  constructor(private readonly options: UnpredictableSchedulerOptions) {}

  async start(): Promise<IngressPayload> {
    this.stop();
    this.stopped = false;
    const next = await createUnpredictableIngress({
      minDelayMs: this.options.minDelayMs,
      maxDelayMs: this.options.maxDelayMs,
      channelId: this.options.channelId,
    });
    const delay = Math.max(1, new Date(next.scheduledAt).getTime() - Date.now());
    this.timer = setTimeout(() => {
      void this.fire(next);
    }, delay);
    return next;
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async fire(payload: IngressPayload): Promise<void> {
    if (this.stopped) return;
    const triggered = await triggerIngress(payload);
    await this.options.onTriggered(triggered);
    if (!this.stopped) await this.start();
  }
}
