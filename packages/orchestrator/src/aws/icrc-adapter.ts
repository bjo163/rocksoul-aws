import type { AwsVerifiedSourceSnapshot } from './source-worker.js';
import { AwsOfficialSourceHttpClient } from './source-http.js';
import { awsHtmlToText, parseAwsEnglishDate } from './html-normalization.js';

export const AWS_ICRC_ORIGIN = 'https://ihl-databases.icrc.org';
export const AWS_ICRC_GCIV_TITLE_URL =
  'https://ihl-databases.icrc.org/en/ihl-treaties/gciv-1949/title';

export interface AwsIcrcGcivPayload extends Record<string, unknown> {
  source_family: 'ICRC_IHL';
  instrument_id: 'LAW-IHL-GCIV-1949';
  stable_id: 'icrc:gciv-1949';
  title: string;
  short_title: 'Geneva Convention IV';
  instrument_type: 'convention';
  adoption_date: string;
  source_role: 'PRIMARY_TEXT';
}

export function parseIcrcGcivTitlePage(html: string): AwsIcrcGcivPayload {
  const text = awsHtmlToText(html);
  const titleMatch = text.match(
    /(Convention \(IV\) relative to the Protection of Civilian Persons in Time of War)\.\s*Geneva,\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})\.?/i,
  );
  if (!titleMatch) throw new Error('AWS_ICRC_GCIV_TITLE_NOT_FOUND');

  const adoptionDate = parseAwsEnglishDate(titleMatch[2]);
  if (!adoptionDate) throw new Error('AWS_ICRC_GCIV_ADOPTION_DATE_INVALID');

  return {
    source_family: 'ICRC_IHL',
    instrument_id: 'LAW-IHL-GCIV-1949',
    stable_id: 'icrc:gciv-1949',
    title: titleMatch[1],
    short_title: 'Geneva Convention IV',
    instrument_type: 'convention',
    adoption_date: adoptionDate,
    source_role: 'PRIMARY_TEXT',
  };
}

export class AwsIcrcAdapter {
  constructor(
    private readonly http = new AwsOfficialSourceHttpClient(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async fetchGciv(): Promise<AwsVerifiedSourceSnapshot> {
    const html = await this.http.getText(AWS_ICRC_GCIV_TITLE_URL, {
      allowedOrigins: [AWS_ICRC_ORIGIN],
    });
    return {
      sourceId: 'SRC-AWS-ICRC-IHL',
      sourceUrl: AWS_ICRC_GCIV_TITLE_URL,
      capturedAt: this.now().toISOString(),
      payload: parseIcrcGcivTitlePage(html),
    };
  }
}
