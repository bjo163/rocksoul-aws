import { createHash } from 'node:crypto';
import type { EventRecord } from './types.js';

export function canonicalEventPayload(event: EventRecord, previousHash = ''): string {
  return JSON.stringify({
    eventId: event.eventId,
    entityId: event.entityId,
    eventType: event.eventType,
    payload: event.payload ?? {},
    occurredAt: event.occurredAt,
    actorId: event.actorId ?? null,
    deviceId: event.deviceId ?? null,
    source: event.source ?? null,
    previousHash,
  });
}

export function hashEvent(event: EventRecord, previousHash = ''): string {
  return createHash('sha256').update(canonicalEventPayload(event, previousHash)).digest('hex');
}
