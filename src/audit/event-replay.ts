import type { EventRecord } from '../../packages/persistence/src/types.js';

export interface ReplayState {
  eventCount: number;
  lastEventId: string | null;
  lastOccurredAt: string | null;
  state: Record<string, unknown>;
}

export interface ReplayOptions {
  entityId?: string;
  upTo?: string;
}

export function replayEvents(events: EventRecord[], options: ReplayOptions = {}): ReplayState {
  const filtered = events
    .filter((event) => !options.entityId || event.entityId === options.entityId)
    .filter((event) => !options.upTo || String(event.occurredAt ?? '') <= options.upTo)
    .sort((a, b) => {
      const at = String(a.occurredAt ?? '');
      const bt = String(b.occurredAt ?? '');
      return at.localeCompare(bt) || a.eventId.localeCompare(b.eventId);
    });
  const state: Record<string, unknown> = {};
  for (const event of filtered) state[event.eventType] = structuredClone(event.payload);
  const last = filtered.at(-1) ?? null;
  return {
    eventCount: filtered.length,
    lastEventId: last?.eventId ?? null,
    lastOccurredAt: last?.occurredAt ?? null,
    state,
  };
}

export function replayCaseEvents(events: EventRecord[], caseId: string): ReplayState {
  return replayEvents(events, { entityId: caseId });
}
