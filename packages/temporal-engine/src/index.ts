export type TemporalScope = 'INSTANT' | 'INTERVAL' | string;

export interface TimeEvent {
  occurredAt: string;
  calendar: string;
  eraId: string;
  duration: number | string | null;
  temporalScope: TemporalScope;
}

export interface MakeTimeEventInput {
  occurredAt?: string;
  calendar?: string;
  eraId?: string;
  duration?: number | string | null;
  temporalScope?: TemporalScope;
}

/** Return the current timestamp in the canonical wire format. */
export function now(): string {
  return new Date().toISOString();
}

/** Create a host-neutral temporal event without persistence or domain policy. */
export function makeTimeEvent(input: MakeTimeEventInput = {}): TimeEvent {
  return {
    occurredAt: input.occurredAt ?? now(),
    calendar: input.calendar ?? 'ISO_GREGORIAN',
    eraId: input.eraId ?? 'CURRENT',
    duration: input.duration ?? null,
    temporalScope: input.temporalScope ?? 'INSTANT'
  };
}

/** Compare two temporal values, returning the millisecond difference. */
export function compareTime(a: string | Date, b: string | Date): number {
  return new Date(a).getTime() - new Date(b).getTime();
}
