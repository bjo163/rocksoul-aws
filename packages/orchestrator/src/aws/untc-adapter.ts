import type { AwsVerifiedSourceSnapshot } from './source-worker.js';
import { AwsOfficialSourceHttpClient } from './source-http.js';
import { awsHtmlTableRows, awsHtmlToText, parseAwsEnglishDate } from './html-normalization.js';
import type { AwsTreatyActionCandidate, AwsTreatyActionType } from './treaty-actions.js';

export const AWS_UNTC_ORIGIN = 'https://treaties.un.org';
export const AWS_UNTC_GENOCIDE_URL =
  'https://treaties.un.org/Pages/ShowMTDSGDetails.aspx?chapter=4&lang=en&mtdsg_no=IV-1&src=UNTSONLINE&tabid=2';

export interface AwsUntcGenocidePayload extends Record<string, unknown> {
  source_family: 'UNTC';
  instrument_id: 'LAW-UN-GENOCIDE-1948';
  stable_id: 'untc:IV-1';
  title: string;
  instrument_type: 'convention';
  adoption_place: string;
  adoption_date: string;
  entry_into_force_date: string;
  signatories: number;
  parties: number;
  treaty_actions: AwsTreatyActionCandidate[];
  source_role: 'DEPOSITARY_STATUS';
}

function actorRef(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\^\{[^}]*\}\s*/g, ' ')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
  return `state-name:${normalized}`;
}

function parseParticipantAction(
  actorName: string,
  raw: string,
  sourceUrl: string,
  retrievedAt: string,
): AwsTreatyActionCandidate | null {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const match = normalized.match(/^(\d{1,2}\s+[A-Za-z]+\s+\d{4})(?:\s+([ad]))?$/i);
  if (!match) return null;
  const actionDate = parseAwsEnglishDate(match[1]);
  if (!actionDate) return null;

  const suffix = match[2]?.toLowerCase();
  const action: AwsTreatyActionType =
    suffix === 'a' ? 'accession' :
    suffix === 'd' ? 'succession' :
    'ratification';

  return {
    instrument_ref: 'LAW-UN-GENOCIDE-1948',
    actor_ref: actorRef(actorName),
    actor_name: actorName,
    action,
    action_date: actionDate,
    effective_date: null,
    source: {
      url: sourceUrl,
      retrieved_at: retrievedAt,
      depositary_notification_id: null,
      sha256: null,
    },
    research_state: 'CROSS_CHECKED',
  };
}

function signatureAction(
  actorName: string,
  raw: string,
  sourceUrl: string,
  retrievedAt: string,
): AwsTreatyActionCandidate | null {
  const actionDate = parseAwsEnglishDate(raw.replace(/\s+/g, ' ').trim());
  if (!actionDate) return null;
  return {
    instrument_ref: 'LAW-UN-GENOCIDE-1948',
    actor_ref: actorRef(actorName),
    actor_name: actorName,
    action: 'signature',
    action_date: actionDate,
    effective_date: null,
    source: {
      url: sourceUrl,
      retrieved_at: retrievedAt,
      depositary_notification_id: null,
      sha256: null,
    },
    research_state: 'CROSS_CHECKED',
  };
}

export function parseUntcGenocidePage(
  html: string,
  retrievedAt: string,
  sourceUrl = AWS_UNTC_GENOCIDE_URL,
): AwsUntcGenocidePayload {
  const text = awsHtmlToText(html);
  const titleMatch = text.match(
    /(Convention on the Prevention and Punishment of the Crime of Genocide)\s+Paris,\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  );
  if (!titleMatch) throw new Error('AWS_UNTC_GENOCIDE_TITLE_NOT_FOUND');

  const adoptionDate = parseAwsEnglishDate(titleMatch[2]);
  if (!adoptionDate) throw new Error('AWS_UNTC_GENOCIDE_ADOPTION_DATE_INVALID');

  const entryMatch = text.match(/Entry into force\s*:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (!entryMatch) throw new Error('AWS_UNTC_GENOCIDE_ENTRY_INTO_FORCE_NOT_FOUND');
  const entryIntoForce = parseAwsEnglishDate(entryMatch[1]);
  if (!entryIntoForce) throw new Error('AWS_UNTC_GENOCIDE_ENTRY_INTO_FORCE_INVALID');

  const statusMatch = text.match(/Status\s*:\s*Signatories\s*:\s*(\d+)\.?\s*Parties\s*:\s*(\d+)/i);
  if (!statusMatch) throw new Error('AWS_UNTC_GENOCIDE_STATUS_NOT_FOUND');

  const actions: AwsTreatyActionCandidate[] = [];
  for (const cells of awsHtmlTableRows(html)) {
    if (cells.length < 3) continue;
    const [participant, signature, participation] = cells;
    if (!participant || /^participant$/i.test(participant)) continue;

    const signatureCandidate = signatureAction(participant, signature, sourceUrl, retrievedAt);
    if (signatureCandidate) actions.push(signatureCandidate);

    const participationCandidate = parseParticipantAction(participant, participation, sourceUrl, retrievedAt);
    if (participationCandidate) actions.push(participationCandidate);
  }

  return {
    source_family: 'UNTC',
    instrument_id: 'LAW-UN-GENOCIDE-1948',
    stable_id: 'untc:IV-1',
    title: titleMatch[1],
    instrument_type: 'convention',
    adoption_place: 'Paris',
    adoption_date: adoptionDate,
    entry_into_force_date: entryIntoForce,
    signatories: Number(statusMatch[1]),
    parties: Number(statusMatch[2]),
    treaty_actions: actions,
    source_role: 'DEPOSITARY_STATUS',
  };
}

export class AwsUntcAdapter {
  constructor(
    private readonly http = new AwsOfficialSourceHttpClient(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async fetchGenocideConvention(): Promise<AwsVerifiedSourceSnapshot> {
    const capturedAt = this.now().toISOString();
    const html = await this.http.getText(AWS_UNTC_GENOCIDE_URL, {
      allowedOrigins: [AWS_UNTC_ORIGIN],
      maxBytes: 4 * 1024 * 1024,
    });
    return {
      sourceId: 'SRC-AWS-UNTC',
      sourceUrl: AWS_UNTC_GENOCIDE_URL,
      capturedAt,
      payload: parseUntcGenocidePage(html, capturedAt),
    };
  }
}
