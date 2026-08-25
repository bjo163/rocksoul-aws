import crypto from 'node:crypto';
import { hashEvent } from './hash.js';
import type { AuditRecord } from './types.js';

declare global {
  var normalizeAudit: (row: Record<string, unknown>) => AuditRecord;
}

export function makeAuditRecord(input: Omit<AuditRecord, 'auditId'>, previousHash?: string): AuditRecord {
  const auditId = `AUD-${crypto.randomUUID()}`;
  return { auditId, ...input, ...(previousHash !== undefined ? { previousHash } : {}) };
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

export function normalizeAudit(row: Record<string, unknown>): AuditRecord {
  return {
    auditId: String(row.audit_id ?? ''),
    operation: row.operation === 'UPDATE' || row.operation === 'DELETE' ? row.operation : 'CREATE',
    modelType: String(row.model_type ?? ''),
    recordId: String(row.record_id ?? ''),
    actorId: String(row.actor_id ?? ''),
    timestamp: String(row.timestamp ?? ''),
    changedFields: Array.isArray(row.changed_fields)
      ? row.changed_fields.filter((value): value is string => typeof value === 'string')
      : Array.isArray(row.changed_fields_json)
        ? row.changed_fields_json.filter((value): value is string => typeof value === 'string')
        : [],
    before: isRecord(row.before_json) ? row.before_json : null,
    after: isRecord(row.after_json) ? row.after_json : null,
    correlationId: row.correlation_id == null ? null : String(row.correlation_id),
    reason: row.reason == null ? null : String(row.reason),
    previousHash: row.previous_hash == null ? undefined : String(row.previous_hash),
    hash: row.hash == null ? undefined : String(row.hash),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

globalThis.normalizeAudit = normalizeAudit;
