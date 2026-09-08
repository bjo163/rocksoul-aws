import crypto from 'node:crypto';
import type { AwsLegalStore } from './legal-store.js';
import type {
  AwsReanalysisJobPayload,
  AwsSourceWorker,
  AwsVerifiedSourceSnapshot,
} from './source-worker.js';
import {
  addMinutes,
  awsFreshnessId,
  evaluateAwsFreshness,
  isAwsMonitorDue,
  type AwsSourceFreshness,
  type AwsSourceMonitor,
} from './source-freshness.js';
import { diffAwsSourceRevisions } from './revision-diff.js';
import { evaluateAwsApplicability } from './applicability-engine.js';
import {
  evaluateAwsClaimAssessment,
  synthesizeAwsCase,
} from './legal-assessment-engine.js';

export interface AwsContinuousQueue {
  enqueue<T>(type: string, payload: T, idempotencyKey?: string): Promise<{ id: string }>;
  register<T, R>(type: string, handler: (payload: T) => Promise<R>): void;
  list(status?: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'): Promise<Array<{
    id: string;
    type: string;
    status: string;
    payload: unknown;
    error?: string;
  }>>;
}

export type AwsSourcePoller = () => Promise<AwsVerifiedSourceSnapshot>;

export interface AwsSourcePollerRegistry {
  'icrc-gciv': AwsSourcePoller;
  'untc-genocide': AwsSourcePoller;
  'icj-bosnia-serbia': AwsSourcePoller;
}

export interface AwsPollJobPayload {
  monitorId: string;
  scheduledFor: string;
}

interface CandidateResult {
  ref: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

function hash24(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24).toUpperCase();
}

function researchRunId(monitorId: string, scheduledFor: string): string {
  return `RRUN-AWS-${hash24(`${monitorId}|${scheduledFor}`)}`;
}

function reviewId(sourceRef: string, revisionRef: string): string {
  return `RVIEW-AWS-${hash24(`${sourceRef}|${revisionRef}`)}`;
}

function candidateId(caseRef: string, revisionRef: string): string {
  return `RCAND-AWS-${hash24(`${caseRef}|${revisionRef}`)}`;
}

export class AwsContinuousResearchService {
  private monitorById = new Map<string, AwsSourceMonitor>();

  constructor(
    private readonly legalStore: AwsLegalStore,
    private readonly sourceWorker: AwsSourceWorker,
    private readonly queue: AwsContinuousQueue,
    private readonly pollers: AwsSourcePollerRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  registerHandlers(monitors: readonly AwsSourceMonitor[]): void {
    this.monitorById = new Map(monitors.map((monitor) => [monitor.id, monitor]));

    this.queue.register<AwsPollJobPayload, Record<string, unknown>>(
      'AWS_POLL_SOURCE',
      async (payload) => {
        const monitor = this.monitorById.get(payload.monitorId);
        if (!monitor) throw new Error(`AWS_MONITOR_MISSING:${payload.monitorId}`);
        return this.pollMonitor(monitor, payload.scheduledFor);
      },
    );

    this.queue.register<AwsReanalysisJobPayload, Record<string, unknown>>(
      'AWS_REANALYZE_CASE',
      async (payload) => this.reanalyzeCase(payload),
    );
  }

  async scheduleDueSources(monitors: readonly AwsSourceMonitor[]): Promise<string[]> {
    const now = this.now().toISOString();
    const ids: string[] = [];

    for (const monitor of monitors) {
      const freshnessRecord = await this.legalStore.getRecord<AwsSourceFreshness>(
        awsFreshnessId(monitor.source_ref),
      );
      const freshness = freshnessRecord?.kind === 'SOURCE_FRESHNESS'
        ? freshnessRecord.payload
        : null;

      if (!isAwsMonitorDue(monitor, freshness, now)) continue;

      const scheduledFor = freshness?.next_due_at && freshness.next_due_at <= now
        ? freshness.next_due_at
        : now;
      const job = await this.queue.enqueue(
        'AWS_POLL_SOURCE',
        { monitorId: monitor.id, scheduledFor },
        `aws-poll:${monitor.id}:${scheduledFor}`,
      );
      ids.push(job.id);
    }

    return ids;
  }

  async refreshStaleStates(monitors: readonly AwsSourceMonitor[]): Promise<string[]> {
    const now = this.now().toISOString();
    const stale: string[] = [];
    for (const monitor of monitors) {
      const id = awsFreshnessId(monitor.source_ref);
      const record = await this.legalStore.getRecord<AwsSourceFreshness>(id);
      if (!record || record.kind !== 'SOURCE_FRESHNESS') continue;
      if (record.payload.freshness_state === 'UNAVAILABLE') continue;

      const state = evaluateAwsFreshness({
        now,
        lastSuccessAt: record.payload.last_success_at,
        staleAfterMinutes: monitor.stale_after_minutes,
      });
      if (state !== record.payload.freshness_state) {
        await this.legalStore.upsertRecordIfChanged('SOURCE_FRESHNESS', id, {
          ...record.payload,
          freshness_state: state,
        });
      }
      if (state === 'STALE') stale.push(monitor.source_ref);
    }
    return stale.sort();
  }

  async pollMonitor(
    monitor: AwsSourceMonitor,
    scheduledFor: string,
  ): Promise<Record<string, unknown>> {
    const runId = researchRunId(monitor.id, scheduledFor);
    const existingRun = await this.legalStore.getRecord<Record<string, unknown>>(runId);
    const startedAt =
      existingRun?.kind === 'RESEARCH_RUN' &&
      typeof existingRun.payload.started_at === 'string'
        ? existingRun.payload.started_at
        : this.now().toISOString();
    const previous = await this.legalStore.latestSourceRevision(monitor.source_ref);
    const freshnessId = awsFreshnessId(monitor.source_ref);
    const previousFreshness = await this.legalStore.getRecord<AwsSourceFreshness>(freshnessId);

    await this.legalStore.upsertRecordIfChanged('RESEARCH_RUN', runId, {
      id: runId,
      monitor_ref: monitor.id,
      source_ref: monitor.source_ref,
      started_at: startedAt,
      finished_at: null,
      status: 'RUNNING',
      changed: false,
      revision_ref: null,
      revision_diff_ref: null,
      affected_case_refs: [],
      reanalysis_job_refs: [],
      error: null,
    });

    try {
      const poller = this.pollers[monitor.adapter_key];
      if (!poller) throw new Error(`AWS_POLLER_MISSING:${monitor.adapter_key}`);
      const snapshot = await poller();
      if (snapshot.sourceId !== monitor.source_ref) {
        throw new Error(`AWS_POLLER_SOURCE_MISMATCH:${snapshot.sourceId}:${monitor.source_ref}`);
      }

      const sourceResult = await this.sourceWorker.process(snapshot);
      let diffRef: string | null = null;

      if (sourceResult.changed && sourceResult.revision) {
        const diff = diffAwsSourceRevisions({
          sourceRef: monitor.source_ref,
          fromRevisionRef: previous?.revisionId ?? null,
          toRevisionRef: sourceResult.revision.revisionId,
          before: previous?.payload ?? null,
          after: sourceResult.revision.payload,
        });
        await this.legalStore.upsertRecordIfChanged('REVISION_DIFF', diff.id, diff);
        diffRef = diff.id;

        const rviewId = reviewId(monitor.source_ref, sourceResult.revision.revisionId);
        await this.legalStore.upsertRecordIfChanged('RESEARCH_REVIEW', rviewId, {
          id: rviewId,
          source_ref: monitor.source_ref,
          revision_ref: sourceResult.revision.revisionId,
          revision_diff_ref: diff.id,
          case_refs: [...sourceResult.affectedCaseIds],
          candidate_refs: [],
          reason: 'Verified official-source content changed. Canonical legal objects/results require explicit review before mutation.',
          state: 'REVIEW_REQUIRED',
          created_at: this.now().toISOString(),
        });
        await this.legalStore.appendResearchEvent(
          rviewId,
          'AWS.RESEARCH.REVIEW_REQUIRED',
          {
            source_ref: monitor.source_ref,
            revision_ref: sourceResult.revision.revisionId,
            revision_diff_ref: diff.id,
          },
          this.now().toISOString(),
        );
      }

      const finishedAt = this.now().toISOString();
      const existingChange = previousFreshness?.kind === 'SOURCE_FRESHNESS'
        ? previousFreshness.payload.change_state
        : 'UNCHANGED';
      const changeState = sourceResult.changed
        ? 'REVIEW_REQUIRED'
        : existingChange === 'REVIEW_REQUIRED'
          ? 'REVIEW_REQUIRED'
          : 'UNCHANGED';

      await this.legalStore.upsertRecordIfChanged('SOURCE_FRESHNESS', freshnessId, {
        id: freshnessId,
        source_ref: monitor.source_ref,
        freshness_state: 'FRESH',
        change_state: changeState,
        last_checked_at: finishedAt,
        last_success_at: finishedAt,
        last_change_at: sourceResult.changed
          ? finishedAt
          : previousFreshness?.kind === 'SOURCE_FRESHNESS'
            ? previousFreshness.payload.last_change_at
            : null,
        next_due_at: addMinutes(finishedAt, monitor.poll_interval_minutes),
        consecutive_failures: 0,
        last_error: null,
      });

      const run = {
        id: runId,
        monitor_ref: monitor.id,
        source_ref: monitor.source_ref,
        started_at: startedAt,
        finished_at: finishedAt,
        status: 'COMPLETED',
        changed: sourceResult.changed,
        revision_ref: sourceResult.revision?.revisionId ?? null,
        revision_diff_ref: diffRef,
        affected_case_refs: sourceResult.affectedCaseIds,
        reanalysis_job_refs: sourceResult.enqueuedJobIds,
        error: null,
      };
      await this.legalStore.upsertRecordIfChanged('RESEARCH_RUN', runId, run);
      await this.legalStore.appendResearchEvent(
        runId,
        'AWS.RESEARCH.POLL_COMPLETED',
        {
          source_ref: monitor.source_ref,
          changed: sourceResult.changed,
          affected_case_refs: sourceResult.affectedCaseIds,
        },
        finishedAt,
      );
      return run;
    } catch (error) {
      const finishedAt = this.now().toISOString();
      const message = error instanceof Error ? error.message : String(error);
      const old = previousFreshness?.kind === 'SOURCE_FRESHNESS'
        ? previousFreshness.payload
        : null;

      await this.legalStore.upsertRecordIfChanged('SOURCE_FRESHNESS', freshnessId, {
        id: freshnessId,
        source_ref: monitor.source_ref,
        freshness_state: 'UNAVAILABLE',
        change_state: old?.change_state ?? 'UNCHANGED',
        last_checked_at: finishedAt,
        last_success_at: old?.last_success_at ?? null,
        last_change_at: old?.last_change_at ?? null,
        next_due_at: addMinutes(finishedAt, monitor.poll_interval_minutes),
        consecutive_failures: (old?.consecutive_failures ?? 0) + 1,
        last_error: message,
      });

      await this.legalStore.upsertRecordIfChanged('RESEARCH_RUN', runId, {
        id: runId,
        monitor_ref: monitor.id,
        source_ref: monitor.source_ref,
        started_at: startedAt,
        finished_at: finishedAt,
        status: 'FAILED',
        changed: false,
        revision_ref: null,
        revision_diff_ref: null,
        affected_case_refs: [],
        reanalysis_job_refs: [],
        error: message,
      });
      await this.legalStore.appendResearchEvent(
        runId,
        'AWS.RESEARCH.POLL_FAILED',
        { source_ref: monitor.source_ref, error: message },
        finishedAt,
      );
      throw error;
    }
  }

  async reanalyzeCase(payload: AwsReanalysisJobPayload): Promise<Record<string, unknown>> {
    const caseRecord = await this.legalStore.getRecord(payload.caseId);
    if (!caseRecord || !['CASE', 'LEGAL_CASE'].includes(caseRecord.kind)) {
      throw new Error(`AWS_REANALYSIS_CASE_MISSING:${payload.caseId}`);
    }

    const casePayload = caseRecord.payload as Record<string, any>;
    const applicabilityRefs: string[] = caseRecord.kind === 'CASE'
      ? [...(casePayload.aws_refs?.applicability ?? [])]
      : [...(casePayload.applicability_refs ?? [])];
    const claimAssessmentRefs: string[] = caseRecord.kind === 'LEGAL_CASE'
      ? [...(casePayload.claim_assessment_refs ?? [])]
      : [];
    const synthesisRefs: string[] = caseRecord.kind === 'LEGAL_CASE'
      ? [...(casePayload.case_synthesis_refs ?? [])]
      : [];

    const applicability: CandidateResult[] = [];
    const computedApplicability = new Map<string, string>();
    for (const ref of applicabilityRefs) {
      const record = await this.legalStore.getRecord<Record<string, any>>(ref);
      if (!record || record.kind !== 'APPLICABILITY') continue;
      const before = record.payload.overall;
      const after = evaluateAwsApplicability(record.payload.dimensions);
      computedApplicability.set(ref, after);
      applicability.push({ ref, before, after, changed: before !== after });
    }

    const claimAssessments: CandidateResult[] = [];
    const computedClaims = new Map<string, string>();
    for (const ref of claimAssessmentRefs) {
      const record = await this.legalStore.getRecord<Record<string, any>>(ref);
      if (!record || record.kind !== 'CLAIM_ASSESSMENT') continue;
      const applicabilityState = computedApplicability.get(record.payload.applicability_ref)
        ?? (await this.legalStore.getRecord<Record<string, any>>(record.payload.applicability_ref))?.payload.overall
        ?? 'UNCERTAIN';
      const before = record.payload.result;
      const after = evaluateAwsClaimAssessment({
        applicability: applicabilityState as any,
        supportingHoldingRefs: record.payload.supporting_holding_refs ?? [],
        contradictingHoldingRefs: record.payload.contradicting_holding_refs ?? [],
      });
      computedClaims.set(ref, after);
      claimAssessments.push({ ref, before, after, changed: before !== after });
    }

    const syntheses: CandidateResult[] = [];
    for (const ref of synthesisRefs) {
      const record = await this.legalStore.getRecord<Record<string, any>>(ref);
      if (!record || record.kind !== 'CASE_SYNTHESIS') continue;
      const results = (record.payload.claim_assessment_refs ?? []).map(
        (claimRef: string) => computedClaims.get(claimRef) ?? 'UNRESOLVED',
      );
      const before = record.payload.result;
      const after = synthesizeAwsCase(results as any);
      syntheses.push({ ref, before, after, changed: before !== after });
    }

    const diffs = await this.legalStore.listRecords<Record<string, any>>('REVISION_DIFF');
    const revisionDiff = diffs.find((item) => item.payload.to_revision_ref === payload.revisionId);
    const changedScopes = ['SOURCE_CONTENT'];
    for (const item of applicability.filter((item) => item.changed)) changedScopes.push(`APPLICABILITY:${item.ref}`);
    for (const item of claimAssessments.filter((item) => item.changed)) changedScopes.push(`CLAIM_ASSESSMENT:${item.ref}`);
    for (const item of syntheses.filter((item) => item.changed)) changedScopes.push(`CASE_SYNTHESIS:${item.ref}`);

    const id = candidateId(payload.caseId, payload.revisionId);
    const candidate = {
      id,
      case_ref: payload.caseId,
      source_ref: payload.sourceId,
      revision_ref: payload.revisionId,
      revision_diff_ref: revisionDiff?.id ?? null,
      generated_at: this.now().toISOString(),
      changed_scopes: [...new Set(changedScopes)].sort(),
      applicability,
      claim_assessments: claimAssessments,
      case_syntheses: syntheses,
      canonical_mutation: false,
      review_state: 'REVIEW_REQUIRED',
    };
    await this.legalStore.upsertRecordIfChanged('REANALYSIS_CANDIDATE', id, candidate);

    const rviewId = reviewId(payload.sourceId, payload.revisionId);
    const review = await this.legalStore.getRecord<Record<string, any>>(rviewId);
    if (review?.kind === 'RESEARCH_REVIEW') {
      await this.legalStore.upsertRecordIfChanged('RESEARCH_REVIEW', rviewId, {
        ...review.payload,
        case_refs: [...new Set([...(review.payload.case_refs ?? []), payload.caseId])].sort(),
        candidate_refs: [...new Set([...(review.payload.candidate_refs ?? []), id])].sort(),
      });
    }

    await this.legalStore.appendResearchEvent(
      id,
      'AWS.RESEARCH.REANALYSIS_CANDIDATE_CREATED',
      {
        case_ref: payload.caseId,
        source_ref: payload.sourceId,
        revision_ref: payload.revisionId,
        canonical_mutation: false,
      },
      this.now().toISOString(),
    );
    return candidate;
  }

  async syncDeadLetterRuns(): Promise<string[]> {
    const dead = await this.queue.list('DEAD_LETTER');
    const updated: string[] = [];
    for (const job of dead) {
      if (job.type !== 'AWS_POLL_SOURCE') continue;
      const payload = job.payload as AwsPollJobPayload;
      const runId = researchRunId(payload.monitorId, payload.scheduledFor);
      const run = await this.legalStore.getRecord<Record<string, any>>(runId);
      if (!run || run.kind !== 'RESEARCH_RUN') continue;
      if (run.payload.status === 'DEAD_LETTER') continue;
      await this.legalStore.upsertRecordIfChanged('RESEARCH_RUN', runId, {
        ...run.payload,
        status: 'DEAD_LETTER',
        error: job.error ?? run.payload.error ?? 'DEAD_LETTER',
      });
      updated.push(runId);
    }
    return updated.sort();
  }
}

export class AwsResearchScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private readonly service: AwsContinuousResearchService,
    private readonly monitors: readonly AwsSourceMonitor[],
    private readonly tickMs = 60_000,
  ) {}

  async tick(): Promise<string[]> {
    await this.service.refreshStaleStates(this.monitors);
    await this.service.syncDeadLetterRuns();
    return this.service.scheduleDueSources(this.monitors);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = async () => {
      if (!this.running) return;
      try { await this.tick(); } finally {
        if (this.running) this.timer = setTimeout(loop, this.tickMs);
      }
    };
    this.timer = setTimeout(loop, 0);
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
