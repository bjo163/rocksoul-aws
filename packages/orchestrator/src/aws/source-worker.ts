import crypto from 'node:crypto';
import { AwsLegalStore, type AwsSourceRevision } from './legal-store.js';
import { canonicalizeAwsContent } from './content-canonicalization.js';

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



export function fingerprintAwsSourcePayload(payload: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeAwsContent(payload))).digest('hex');
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
