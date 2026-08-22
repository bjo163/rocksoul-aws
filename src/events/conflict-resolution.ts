import type { InterpretedEvent } from './event-interpreter.js';

type Loose = Record<string, any>;

export type ConflictResolutionState =
  | 'NONE'
  | 'SEQUENCE_RESOLVED'
  | 'ACTUAL_CONFLICT'
  | 'INSUFFICIENT_EVIDENCE';

export interface EventConflictResolution {
  protocol: 'REVELATION_EVENT_CONFLICT_RESOLUTION_V1';
  state: ConflictResolutionState;
  blockingMizan: boolean;
  requiresHumanReview: boolean;
  normativePriorityApplied: false;
  sides: Loose[];
  rationale: string;
  boundary: string;
}

const resolved = (event: InterpretedEvent) =>
  event.binding.pureNormativeDerivation === true &&
  ['POSITIVE', 'NEGATIVE'].includes(event.binding.direction);

export function resolveEventConflicts(events: InterpretedEvent[]): EventConflictResolution {
  const evidence = events.filter(resolved);
  const negative = evidence.filter(event => event.binding.direction === 'NEGATIVE');
  const positive = evidence.filter(event => event.binding.direction === 'POSITIVE');
  const opposingSameEvent = evidence.filter(event =>
    evidence.some(other =>
      other.eventId === event.eventId &&
      other.binding.direction !== event.binding.direction
    )
  );

  if (opposingSameEvent.length > 0) {
    return {
      protocol: 'REVELATION_EVENT_CONFLICT_RESOLUTION_V1',
      state: 'ACTUAL_CONFLICT',
      blockingMizan: true,
      requiresHumanReview: true,
      normativePriorityApplied: false,
      sides: opposingSameEvent.map(event => ({
        eventId: event.eventId,
        action: event.action,
        direction: event.binding.direction,
        references: event.binding.references ?? []
      })),
      rationale: 'One occurred event has opposing Revelation-grounded directions; no software priority is applied.',
      boundary: 'Conflict blocking prevents an established software finding. It is not a divine verdict.'
    };
  }

  if (negative.length > 0 && positive.length > 0) {
    const laterRestoration = positive.some(restoration =>
      restoration.restoration && negative.some(violation => restoration.sequence > violation.sequence)
    );
    if (laterRestoration) {
      return {
        protocol: 'REVELATION_EVENT_CONFLICT_RESOLUTION_V1',
        state: 'SEQUENCE_RESOLVED',
        blockingMizan: false,
        requiresHumanReview: true,
        normativePriorityApplied: false,
        sides: [
          { channel: 'HISTORICAL_VIOLATION', eventIds: negative.map(event => event.eventId) },
          { channel: 'LATER_RESTORATION', eventIds: positive.filter(event => event.restoration).map(event => event.eventId) }
        ],
        rationale: 'Opposing directions belong to distinct ordered events; restoration is retained as a later channel and does not erase history.',
        boundary: 'Sequence separation is an analytical classification, not a claim that restoration was divinely accepted.'
      };
    }
    return {
      protocol: 'REVELATION_EVENT_CONFLICT_RESOLUTION_V1',
      state: 'SEQUENCE_RESOLVED',
      blockingMizan: false,
      requiresHumanReview: true,
      normativePriorityApplied: false,
      sides: [
        { channel: 'NEGATIVE', eventIds: negative.map(event => event.eventId) },
        { channel: 'POSITIVE', eventIds: positive.map(event => event.eventId) }
      ],
      rationale: 'Opposing directions occur in distinct events; the aggregate remains mixed and is not arithmetically netted.',
      boundary: 'Sequence separation is not a moral priority rule and does not produce a divine verdict.'
    };
  }

  return {
    protocol: 'REVELATION_EVENT_CONFLICT_RESOLUTION_V1',
    state: evidence.length > 0 ? 'NONE' : 'INSUFFICIENT_EVIDENCE',
    blockingMizan: false,
    requiresHumanReview: evidence.length === 0,
    normativePriorityApplied: false,
    sides: [],
    rationale: evidence.length > 0 ? 'No opposing Revelation-grounded directions were found.' : 'No sufficient Revelation-grounded direction was available for conflict analysis.',
    boundary: 'Absence of conflict is not proof of complete moral knowledge.'
  };
}
