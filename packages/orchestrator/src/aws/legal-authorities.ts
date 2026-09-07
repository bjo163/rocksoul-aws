import crypto from 'node:crypto';
import type { AwsLegalStore } from './legal-store.js';

export type AwsLegalAuthorityType =
  | 'JUDGMENT'
  | 'ORDER'
  | 'ADVISORY_OPINION'
  | 'OFFICIAL_INTERPRETATION'
  | 'PRESS_RELEASE'
  | 'OTHER';

export interface AwsLegalAuthorityCandidate extends Record<string, unknown> {
  authority_type: AwsLegalAuthorityType;
  title: string;
  case_ref: string | null;
  issuing_body: string;
  date: string;
  document_number: string | null;
  jurisdiction_basis_refs: string[];
  holding_summary: string[];
  source: {
    url: string;
    source_ref: string;
    source_role:
      | 'JUDGMENT'
      | 'ORDER'
      | 'ADVISORY_OPINION'
      | 'OFFICIAL_INTERPRETATION'
      | 'OFFICIAL_SUMMARY';
  };
  research_state:
    | 'DISCOVERED'
    | 'CROSS_CHECKED'
    | 'REVIEW_REQUIRED'
    | 'CANONICAL'
    | 'SUPERSEDED'
    | 'STALE';
}

export function createAwsAuthorityId(
  candidate: Pick<
    AwsLegalAuthorityCandidate,
    'issuing_body' | 'document_number' | 'date' | 'authority_type'
  >,
): string {
  const canonical = [
    candidate.issuing_body,
    candidate.document_number ?? 'undocumented',
    candidate.date,
    candidate.authority_type,
  ].join('|');

  return `AUTH-${crypto
    .createHash('sha256')
    .update(canonical)
    .digest('hex')
    .slice(0, 24)
    .toUpperCase()}`;
}

export async function persistAwsAuthorityCandidate(
  legalStore: AwsLegalStore,
  candidate: AwsLegalAuthorityCandidate,
  explicitId?: string,
): Promise<{ id: string; changed: boolean }> {
  const id = explicitId ?? createAwsAuthorityId(candidate);
  const result = await legalStore.upsertRecordIfChanged('AUTHORITY', id, {
    ...structuredClone(candidate),
    id,
  });

  await legalStore.linkDependency(id, candidate.source.source_ref);
  if (candidate.case_ref) await legalStore.linkDependency(candidate.case_ref, id);

  return { id, changed: result.changed };
}
