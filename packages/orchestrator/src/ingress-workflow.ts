/**
 * Host-neutral orchestration for model-only ingress schedules.
 *
 * The workflow deliberately does not create timers or call the revelation
 * engines. Those concerns belong to the host adapter; this module owns the
 * durable state transition and the idempotency rules around it.
 */

export type IngressScheduleStatus = 'SCHEDULED' | 'TRIGGERED' | 'CANCELLED';

export type IngressScheduleRecord = {
  ingressId: string;
  idempotencyKey: string;
  channelId: string;
  scheduledAt: string;
  status: IngressScheduleStatus;
  payload: Record<string, unknown>;
  triggeredAt?: string;
  version: number;
};

export interface CreateIngressScheduleInput {
  ingressId: string;
  idempotencyKey: string;
  channelId: string;
  scheduledAt: string;
  payload?: Record<string, unknown>;
  now?: string;
}

export interface IngressWorkflowPorts {
  createSchedule(input: CreateIngressScheduleInput): IngressScheduleRecord;
  loadSchedule(input: { ingressId?: string; idempotencyKey?: string }): Promise<IngressScheduleRecord | null>;
  transitionSchedule(input: {
    current: IngressScheduleRecord;
    expectedVersion: number;
    status: IngressScheduleStatus;
    actorId: string;
    now: string;
  }): Promise<IngressScheduleRecord>;
}

export class IngressWorkflowError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'IngressWorkflowError';
  }
}

/** Creates a schedule once per idempotency key. */
export async function runScheduleIngressWorkflow(
  input: CreateIngressScheduleInput,
  ports: Pick<IngressWorkflowPorts, 'loadSchedule' | 'createSchedule'>,
): Promise<{ schedule: IngressScheduleRecord; idempotent: boolean }> {
  if (!input.idempotencyKey.trim()) throw new IngressWorkflowError('INGRESS_IDEMPOTENCY_KEY_REQUIRED');
  if (!input.ingressId.trim()) throw new IngressWorkflowError('INGRESS_ID_REQUIRED');
  if (!input.channelId.trim()) throw new IngressWorkflowError('INGRESS_CHANNEL_REQUIRED');
  if (Number.isNaN(Date.parse(input.scheduledAt))) throw new IngressWorkflowError('INGRESS_SCHEDULE_INVALID');

  const existing = await ports.loadSchedule({ idempotencyKey: input.idempotencyKey });
  if (existing) return { schedule: existing, idempotent: true };

  return { schedule: ports.createSchedule(input), idempotent: false };
}

/**
 * Transitions a schedule to TRIGGERED exactly once. A repeated delivery is a
 * successful no-op and returns the already-triggered record. The persistence
 * adapter must enforce expectedVersion atomically to close concurrent races.
 */
export async function runTriggerIngressWorkflow(
  input: { ingressId: string; actorId: string; now?: string },
  ports: Pick<IngressWorkflowPorts, 'loadSchedule' | 'transitionSchedule'>,
): Promise<{ schedule: IngressScheduleRecord; idempotent: boolean }> {
  const current = await ports.loadSchedule({ ingressId: input.ingressId });
  if (!current) throw new IngressWorkflowError('INGRESS_NOT_FOUND');
  if (current.status === 'TRIGGERED') return { schedule: current, idempotent: true };
  if (current.status === 'CANCELLED') throw new IngressWorkflowError('INGRESS_CANCELLED');

  const now = input.now ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(now))) throw new IngressWorkflowError('INGRESS_TRIGGER_TIME_INVALID');
  const schedule = await ports.transitionSchedule({
    current,
    expectedVersion: current.version,
    status: 'TRIGGERED',
    actorId: input.actorId,
    now,
  });
  return { schedule, idempotent: false };
}

