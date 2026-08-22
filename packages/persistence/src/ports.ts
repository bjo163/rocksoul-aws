import type {
  EntityRepository,
  EntityRecord,
  RelationRepository,
  RelationRecord,
  EventStore,
  EventRecord,
  ProjectionStore,
  ProjectionRecord,
  PersistenceStore,
  ChainVerification,
  TransactionContext,
  TransactionWork,
  AuditStore,
  AuditRecord,
  AuditFields,
} from './types.js';

export class PersistenceError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  constructor(message: string, code = 'PERSISTENCE_ERROR', cause?: unknown) {
    super(message);
    this.name = 'PersistenceError';
    this.code = code;
    this.cause = cause;
  }
}

export type {
  EntityRepository,
  EntityRecord,
  RelationRepository,
  RelationRecord,
  EventStore,
  EventRecord,
  ProjectionStore,
  ProjectionRecord,
  PersistenceStore,
  ChainVerification,
  TransactionContext,
  TransactionWork,
  AuditStore,
  AuditRecord,
  AuditFields,
};
