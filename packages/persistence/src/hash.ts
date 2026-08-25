import { createHash } from 'node:crypto';
import type { EventRecord } from './types.js';

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .filter((key) => record[key] !== undefined)
        .map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
}

function canonicalTimestamp(value: string | Date | null | undefined): string {
  if (value instanceof Date) return value.toISOString();
  const text = String(value ?? '');
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function canonicalEventPayload(event: EventRecord, previousHash = ''): string {
  return canonicalJson({
    eventId: event.eventId,
    entityId: event.entityId,
    eventType: event.eventType,
    payload: event.payload ?? {},
    occurredAt: canonicalTimestamp(event.occurredAt),
    actorId: event.actorId ?? null,
    deviceId: event.deviceId ?? null,
    source: event.source ?? null,
    previousHash,
  });
}

export function hashEvent(event: EventRecord, previousHash = ''): string {
  return createHash('sha256').update(canonicalEventPayload(event, previousHash)).digest('hex');
}
