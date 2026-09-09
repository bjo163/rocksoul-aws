import type { AwsLegalStore } from './legal-store.js';
import {
  evaluateAwsClaimAssessment,
  synthesizeAwsCase,
  type AwsClaimAssessmentResult,
} from './legal-assessment-engine.js';

export interface AwsHoldingRecord extends Record<string, unknown> {
  id: string;
  authority_ref: string;
  case_ref: string;
}

export interface AwsClaimAssessmentRecord extends Record<string, unknown> {
  id: string;
  case_ref: string;
  claim_ref: string;
  applicability_ref: string;
  supporting_holding_refs: string[];
  contradicting_holding_refs: string[];
  result: AwsClaimAssessmentResult;
}

export interface AwsCaseSynthesisRecord extends Record<string, unknown> {
  id: string;
  case_ref: string;
  claim_assessment_refs: string[];
  result: ReturnType<typeof synthesizeAwsCase>;
  legal_result: 'UNRESOLVED';
  mizan_status: 'NOT_RUN';
}

export class AwsLegalAssessmentService {
  constructor(private readonly legalStore: AwsLegalStore) {}

  async persistHolding(record: AwsHoldingRecord): Promise<{ changed: boolean }> {
    const saved = await this.legalStore.upsertRecordIfChanged('HOLDING', record.id, record);
    await this.legalStore.linkDependency(record.id, record.authority_ref);
    await this.legalStore.linkDependency(record.case_ref, record.id);
    return { changed: saved.changed };
  }

  async persistClaimAssessment(
    record: {
      id: string;
      case_ref: string;
      claim_ref: string;
      applicability_ref: string;
      supporting_holding_refs: string[];
      contradicting_holding_refs: string[];
      applicability: 'APPLICABLE' | 'NOT_APPLICABLE' | 'PARTIALLY_APPLICABLE' | 'UNCERTAIN';
    },
  ): Promise<AwsClaimAssessmentRecord> {
    const result = evaluateAwsClaimAssessment({
      applicability: record.applicability,
      supportingHoldingRefs: record.supporting_holding_refs,
      contradictingHoldingRefs: record.contradicting_holding_refs,
    });

    const payload: AwsClaimAssessmentRecord = {
      id: record.id,
      case_ref: record.case_ref,
      claim_ref: record.claim_ref,
      applicability_ref: record.applicability_ref,
      supporting_holding_refs: [...record.supporting_holding_refs],
      contradicting_holding_refs: [...record.contradicting_holding_refs],
      result,
    };

    await this.legalStore.upsertRecordIfChanged('CLAIM_ASSESSMENT', record.id, payload);
    await this.legalStore.linkDependency(record.id, record.claim_ref);
    await this.legalStore.linkDependency(record.id, record.applicability_ref);
    for (const ref of [...record.supporting_holding_refs, ...record.contradicting_holding_refs]) {
      await this.legalStore.linkDependency(record.id, ref);
    }
    await this.legalStore.linkDependency(record.case_ref, record.id);
    return payload;
  }

  async persistCaseSynthesis(
    id: string,
    caseRef: string,
    assessments: readonly AwsClaimAssessmentRecord[],
  ): Promise<AwsCaseSynthesisRecord> {
    const result = synthesizeAwsCase(assessments.map((item) => item.result));
    const payload: AwsCaseSynthesisRecord = {
      id,
      case_ref: caseRef,
      claim_assessment_refs: assessments.map((item) => item.id),
      result,
      legal_result: 'UNRESOLVED',
      mizan_status: 'NOT_RUN',
    };

    await this.legalStore.upsertRecordIfChanged('CASE_SYNTHESIS', id, payload);
    for (const assessment of assessments) {
      await this.legalStore.linkDependency(id, assessment.id);
    }
    await this.legalStore.linkDependency(caseRef, id);
    return payload;
  }
}
