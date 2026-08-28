export type WitnessMetricEvent = 'NODE_APPENDED' | 'CHECKPOINT_CREATED' | 'KEY_ROTATED' | 'KEY_REVOKED' | 'KEY_CREATED' | 'BACKUP_CREATED' | 'RESTORE_COMPLETED' | 'DIAGNOSTIC_RUN';

export interface WitnessMetricsSnapshot {
  startedAt: string;
  counters: Record<WitnessMetricEvent, number>;
  lastEventAt: Partial<Record<WitnessMetricEvent, string>>;
}

export class WitnessObservability {
  private readonly startedAt = new Date().toISOString();
  private readonly counters: Record<WitnessMetricEvent, number> = {
    NODE_APPENDED: 0,
    CHECKPOINT_CREATED: 0,
    KEY_ROTATED: 0,
    KEY_REVOKED: 0,
    KEY_CREATED: 0,
    BACKUP_CREATED: 0,
    RESTORE_COMPLETED: 0,
    DIAGNOSTIC_RUN: 0,
  };
  private readonly lastEventAt: Partial<Record<WitnessMetricEvent, string>> = {};

  record(event: WitnessMetricEvent, at = new Date().toISOString()): void {
    this.counters[event] += 1;
    this.lastEventAt[event] = at;
  }

  snapshot(): WitnessMetricsSnapshot {
    return { startedAt: this.startedAt, counters: { ...this.counters }, lastEventAt: { ...this.lastEventAt } };
  }
}
