import type { AwsLegalStore } from './legal-store.js';

export interface AwsJobInventoryPort {
  list(status?: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'): Promise<Array<{
    id: string;
    type: string;
    status: string;
    updatedAt?: string;
  }>>;
}

function countBy(items: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[item] = (out[item] ?? 0) + 1;
  return out;
}

export class AwsObservabilityService {
  constructor(
    private readonly store: AwsLegalStore,
    private readonly jobs: AwsJobInventoryPort,
  ) {}

  async snapshot() {
    const [
      freshness,
      runs,
      reviews,
      candidates,
      cases,
      legalCases,
      jobs,
      eventIntegrity,
      auditIntegrity,
    ] = await Promise.all([
      this.store.listRecords<Record<string, unknown>>('SOURCE_FRESHNESS'),
      this.store.listRecords<Record<string, unknown>>('RESEARCH_RUN'),
      this.store.listRecords<Record<string, unknown>>('RESEARCH_REVIEW'),
      this.store.listRecords<Record<string, unknown>>('REANALYSIS_CANDIDATE'),
      this.store.listRecords('CASE'),
      this.store.listRecords('LEGAL_CASE'),
      this.jobs.list(),
      this.store.verifyEventIntegrity(),
      this.store.verifyAuditIntegrity(),
    ]);

    const awsJobs = jobs.filter((job) =>
      ['AWS_POLL_SOURCE', 'AWS_REANALYZE_CASE'].includes(job.type),
    );

    return {
      generated_at: new Date().toISOString(),
      cases: {
        cross_repo: cases.length,
        legal: legalCases.length,
        total: cases.length + legalCases.length,
      },
      sources: {
        tracked: freshness.length,
        freshness: countBy(
          freshness.map((record) => String(record.payload.freshness_state ?? 'UNKNOWN')),
        ),
        change_state: countBy(
          freshness.map((record) => String(record.payload.change_state ?? 'UNKNOWN')),
        ),
      },
      research: {
        runs: {
          total: runs.length,
          by_status: countBy(runs.map((record) => String(record.payload.status ?? 'UNKNOWN'))),
        },
        reviews: {
          total: reviews.length,
          by_state: countBy(reviews.map((record) => String(record.payload.state ?? 'UNKNOWN'))),
        },
        candidates: {
          total: candidates.length,
          review_required: candidates.filter(
            (record) => record.payload.review_state === 'REVIEW_REQUIRED',
          ).length,
        },
      },
      jobs: {
        total: awsJobs.length,
        by_status: countBy(awsJobs.map((job) => job.status)),
        by_type: countBy(awsJobs.map((job) => job.type)),
      },
      integrity: {
        events: eventIntegrity,
        audit: auditIntegrity,
      },
    };
  }
}
