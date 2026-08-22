import crypto from 'node:crypto';
import { hashEvent } from './hash.js';
import type { AuditRecord } from './types.js';

export function makeAuditRecord(input: Omit<AuditRecord, 'auditId'>): AuditRecord {
  const auditId = `AUD-${crypto.randomUUID()}`;
  return { auditId, ...input };
}

export function changedFields(before: Record<string, unknown> | null | undefined, after: Record<string, unknown> | null | undefined): string[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const result: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) result.push(key);
  }
  return result.sort();
}

export function hashAudit(record: AuditRecord, previousHash: string): string {
  const { previousHash: _storedPreviousHash, hash: _storedHash, ...canonicalRecord } = record;
  return hashEvent({
    eventId: record.auditId,
    entityId: record.recordId,
    eventType: `AUDIT.${record.operation}`,
    payload: canonicalRecord as unknown as Record<string, unknown>,
    occurredAt: record.timestamp,
    actorId: record.actorId,
    source: 'AUDIT',
  }, previousHash);
}
