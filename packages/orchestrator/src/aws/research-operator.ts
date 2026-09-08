import type { AwsLegalStore } from './legal-store.js';
import type { AwsReanalysisQueue, AwsReanalysisJobPayload } from './source-worker.js';

export class AwsResearchOperatorService {
  constructor(
    private readonly store: AwsLegalStore,
    private readonly queue: AwsReanalysisQueue,
  ) {}

  async requestReanalysis(input: { caseId: string; sourceId: string; requestedBy: string }) {
    const caseRecord = await this.store.getRecord(input.caseId);
    if (!caseRecord || !['CASE', 'LEGAL_CASE'].includes(caseRecord.kind)) {
      throw new Error('AWS_OPERATOR_CASE_NOT_FOUND:' + input.caseId);
    }

    const source = await this.store.getRecord(input.sourceId);
    if (!source || source.kind !== 'SOURCE') {
      throw new Error('AWS_OPERATOR_SOURCE_NOT_FOUND:' + input.sourceId);
    }

    const affected = await this.store.findDependentCases(input.sourceId);
    if (!affected.includes(input.caseId)) {
      throw new Error('AWS_OPERATOR_CASE_NOT_DEPENDENT_ON_SOURCE:' + input.caseId + ':' + input.sourceId);
    }

    const revision = await this.store.latestSourceRevision(input.sourceId);
    if (!revision) {
      throw new Error('AWS_OPERATOR_SOURCE_REVISION_MISSING:' + input.sourceId);
    }

    const payload: AwsReanalysisJobPayload = {
      caseId: input.caseId,
      sourceId: input.sourceId,
      revisionId: revision.revisionId,
      fingerprint: revision.fingerprint,
    };

    const job = await this.queue.enqueue(
      'AWS_REANALYZE_CASE',
      payload,
      'aws:' + input.caseId + ':' + revision.revisionId,
    );

    await this.store.appendResearchEvent(
      input.caseId,
      'AWS.RESEARCH.REANALYSIS_REQUESTED',
      {
        case_ref: input.caseId,
        source_ref: input.sourceId,
        revision_ref: revision.revisionId,
        job_ref: job.id,
        requested_by: input.requestedBy,
        canonical_mutation: false,
      },
      new Date().toISOString(),
      input.requestedBy,
    );

    return {
      case_ref: input.caseId,
      source_ref: input.sourceId,
      revision_ref: revision.revisionId,
      job_ref: job.id,
      status: 'QUEUED',
      canonical_mutation: false,
      mizan_auto_run: false,
    };
  }
}
