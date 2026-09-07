import crypto from 'node:crypto';
import type { AwsLegalStore } from './legal-store.js';

export function createAwsActorRef(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\^\{[^}]*\}\s*/g, ' ')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
  return `state-name:${normalized}`;
}

export type AwsTreatyActionType =
  | 'signature'
  | 'ratification'
  | 'accession'
  | 'acceptance'
  | 'approval'
  | 'succession'
  | 'reservation'
  | 'declaration'
  | 'objection'
  | 'withdrawal'
  | 'denunciation'
  | 'suspension'
  | 'territorial_extension'
  | 'territorial_withdrawal'
  | 'other';

export interface AwsTreatyActionCandidate extends Record<string, unknown> {
  instrument_ref: string;
  actor_ref: string;
  actor_name: string;
  action: AwsTreatyActionType;
  action_date: string | null;
  effective_date: string | null;
  source: {
    url: string;
    retrieved_at: string;
    depositary_notification_id: string | null;
    sha256: string | null;
  };
  research_state: 'DISCOVERED' | 'CROSS_CHECKED' | 'REVIEW_REQUIRED' | 'CANONICAL' | 'SUPERSEDED' | 'STALE';
}

export function createAwsTreatyActionId(candidate: Pick<
  AwsTreatyActionCandidate,
  'instrument_ref' | 'actor_ref' | 'action' | 'action_date'
>): string {
  const canonical = [
    candidate.instrument_ref,
    candidate.actor_ref,
    candidate.action,
    candidate.action_date ?? 'undated',
  ].join('|');
  return `TACT-${crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 24).toUpperCase()}`;
}

export async function persistAwsTreatyActionCandidates(
  legalStore: AwsLegalStore,
  sourceId: string,
  candidates: readonly AwsTreatyActionCandidate[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const candidate of candidates) {
    const id = createAwsTreatyActionId(candidate);
    await legalStore.upsertRecordIfChanged('TREATY_ACTION', id, {
      ...structuredClone(candidate),
      id,
    });
    await legalStore.linkDependency(id, candidate.instrument_ref);
    await legalStore.linkDependency(id, sourceId);
    ids.push(id);
  }
  return ids.sort();
}
