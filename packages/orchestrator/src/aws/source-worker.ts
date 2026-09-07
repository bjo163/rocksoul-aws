import crypto from 'node:crypto';
import { AwsLegalStore, type AwsSourceRevision } from './legal-store.js';

export interface AwsVerifiedSourceSnapshot {
  sourceId: string;
  sourceUrl: string;
  capturedAt: string;
  payload: Record<string, unknown>;
}

export interface AwsReanalysisJobPayload {
  caseId: string;
  sourceId: string;
  revisionId: string;
  fingerprint: string;
}

export interface AwsReanalysisQueue {
  enqueue<T>(type: string, payload: T, idempotencyKey?: string): Promise<{ id: string }>;
}

export interface AwsSourceWorkerResult {
  changed: boolean;
  sourceId: string;
  fingerprint: string;
  revision: AwsSourceRevision | null;
  affectedCaseIds: string[];
  enqueuedJobIds: string[];
}

const VOLATILE_PROVENANCE_KEYS = new Set([
  'retrieved_at',
  'captured_at',
  'fetched_at',
  'polled_at',
]);

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !VOLATILE_PROVENANCE_KEYS.has(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function fingerprintAwsSourcePayload(payload: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');
}

/**
 * Consumes a verified source snapshot. Discovery/fetch/authentication belongs
 * to source adapters outside this core worker.
 *
 * The worker may persist provenance and enqueue re-analysis. It intentionally
 * has no method for changing a legal assessment verdict.
 */
export class AwsSourceWorker {
  constructor(
    private readonly legalStore: AwsLegalStore,
    private readonly queue: AwsReanalysisQueue,
  ) {}

  async process(snapshot: AwsVerifiedSourceSnapshot): Promise<AwsSourceWorkerResult> {
    const fingerprint = fingerprintAwsSourcePayload(snapshot.payload);
    const latest = await this.legalStore.latestSourceRevision(snapshot.sourceId);

    if (latest?.fingerprint === fingerprint) {
      return {
        changed: false,
        sourceId: snapshot.sourceId,
        fingerprint,
        revision: latest,
        affectedCaseIds: [],
        enqueuedJobIds: [],
      };
    }

    const revision = await this.legalStore.persistSourceRevision({
      sourceId: snapshot.sourceId,
      sourceUrl: snapshot.sourceUrl,
      capturedAt: snapshot.capturedAt,
      fingerprint,
      payload: snapshot.payload,
    });

    const affectedCaseIds = await this.legalStore.findDependentCases(snapshot.sourceId);
    const enqueuedJobIds: string[] = [];
    for (const caseId of affectedCaseIds) {
      const payload: AwsReanalysisJobPayload = {
        caseId,
        sourceId: snapshot.sourceId,
        revisionId: revision.revisionId,
        fingerprint,
      };
      const job = await this.queue.enqueue(
        'AWS_REANALYZE_CASE',
        payload,
        `aws:${caseId}:${revision.revisionId}`,
      );
      enqueuedJobIds.push(job.id);
    }

    return {
      changed: true,
      sourceId: snapshot.sourceId,
      fingerprint,
      revision,
      affectedCaseIds,
      enqueuedJobIds,
    };
  }
}
