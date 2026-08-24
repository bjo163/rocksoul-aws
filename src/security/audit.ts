import { createHash } from 'node:crypto';

export type AuditDecision = string;

export interface AuditEventInput {
  actorId?: string | null;
  action: string;
  resource: string;
  decision: AuditDecision;
  metadata?: Record<string, unknown>;
}

export interface AuditEvent extends AuditEventInput {
  actorId: string | null;
  metadata: Record<string, unknown>;
  at: string;
  eventHash: string;
}

export function auditEvent({
  actorId = null,
  action,
  resource,
  decision,
  metadata = {},
}: AuditEventInput): AuditEvent {
  const payload = { actorId, action, resource, decision, metadata, at: new Date().toISOString() };
  return {
    ...payload,
    eventHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
  };
}
