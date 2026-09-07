import type { AwsVerifiedSourceSnapshot } from './source-worker.js';
import { AwsOfficialSourceHttpClient } from './source-http.js';
import { awsHtmlToText, parseAwsEnglishDate } from './html-normalization.js';
import type { AwsLegalAuthorityCandidate } from './legal-authorities.js';

export const AWS_ICJ_ORIGIN = 'https://www.icj-cij.org';
export const AWS_ICJ_BOSNIA_SERBIA_CASE_URL = 'https://www.icj-cij.org/case/91';
export const AWS_ICJ_BOSNIA_SERBIA_JUDGMENT_URL = 'https://www.icj-cij.org/node/103164';

export interface AwsIcjBosniaSerbiaCasePayload extends Record<string, unknown> {
  source_family: 'ICJ';
  legal_case_id: 'LCASE-ICJ-BOSNIA-SERBIA-91';
  case_number: 91;
  title: string;
  applicant: 'Bosnia and Herzegovina';
  respondent: 'Serbia and Montenegro';
  application_date: string;
  jurisdiction_basis: 'Article IX of the Genocide Convention';
  forum_ref: 'JUR-ICJ';
}

export interface AwsIcjBosniaSerbiaJudgmentPayload extends Record<string, unknown> {
  source_family: 'ICJ';
  case_number: 91;
  authority: AwsLegalAuthorityCandidate;
}

function requireCaseTitle(text: string): string {
  const match = text.match(
    /(Application of the Convention on the Prevention and Punishment of the Crime of Genocide\s*\(Bosnia and Herzegovina v\. Serbia and Montenegro\))/i,
  );
  if (!match) throw new Error('AWS_ICJ_CASE_91_TITLE_NOT_FOUND');
  return match[1].replace(/\s+/g, ' ').trim();
}

export function parseIcjBosniaSerbiaCasePage(
  html: string,
): AwsIcjBosniaSerbiaCasePayload {
  const text = awsHtmlToText(html);
  const title = requireCaseTitle(text);
  const applicationMatch = text.match(
    /(?:brought before it on|Application(?: instituting proceedings)?(?: was filed)?(?: on)?)\s+(20\s+March\s+1993)/i,
  );
  if (!applicationMatch) throw new Error('AWS_ICJ_CASE_91_APPLICATION_DATE_NOT_FOUND');
  const applicationDate = parseAwsEnglishDate(applicationMatch[1]);
  if (!applicationDate) throw new Error('AWS_ICJ_CASE_91_APPLICATION_DATE_INVALID');

  if (!/Article\s+IX\s+of\s+the\s+Genocide\s+Convention/i.test(text)) {
    throw new Error('AWS_ICJ_CASE_91_JURISDICTION_BASIS_NOT_FOUND');
  }

  return {
    source_family: 'ICJ',
    legal_case_id: 'LCASE-ICJ-BOSNIA-SERBIA-91',
    case_number: 91,
    title,
    applicant: 'Bosnia and Herzegovina',
    respondent: 'Serbia and Montenegro',
    application_date: applicationDate,
    jurisdiction_basis: 'Article IX of the Genocide Convention',
    forum_ref: 'JUR-ICJ',
  };
}

export function parseIcjBosniaSerbiaJudgmentPage(
  html: string,
  sourceUrl = AWS_ICJ_BOSNIA_SERBIA_JUDGMENT_URL,
): AwsIcjBosniaSerbiaJudgmentPayload {
  const text = awsHtmlToText(html);
  const title = requireCaseTitle(text);

  const documentMatch = text.match(/Document Number\s+(091-20070226-JUD-01-00-EN)/i);
  if (!documentMatch) throw new Error('AWS_ICJ_CASE_91_DOCUMENT_NUMBER_NOT_FOUND');

  const dateMatch = text.match(/Judgment of\s+(26\s+February\s+2007)/i);
  if (!dateMatch) throw new Error('AWS_ICJ_CASE_91_JUDGMENT_DATE_NOT_FOUND');
  const date = parseAwsEnglishDate(dateMatch[1]);
  if (!date) throw new Error('AWS_ICJ_CASE_91_JUDGMENT_DATE_INVALID');

  const holdings: string[] = [];
  if (/affirms? that it has jurisdiction[\s\S]*?Article\s+IX/i.test(text)) {
    holdings.push('The Court affirmed jurisdiction on the basis of Article IX of the Genocide Convention.');
  }
  if (/Serbia has not committed genocide/i.test(text)) {
    holdings.push('The Court found that Serbia had not committed genocide through organs or persons whose acts engaged its responsibility.');
  }
  if (/violated its obligation[^.]*prevent genocide in Srebrenica/i.test(text)) {
    holdings.push('The Court found that Serbia violated its obligation under the Genocide Convention to prevent genocide in Srebrenica.');
  }
  if (/failed fully to co-operate[^.]*International Criminal Tribunal for the former Yugoslavia/i.test(text)) {
    holdings.push('The Court found a breach connected with failure fully to cooperate with the ICTY.');
  }
  if (holdings.length === 0) throw new Error('AWS_ICJ_CASE_91_HOLDINGS_NOT_FOUND');

  return {
    source_family: 'ICJ',
    case_number: 91,
    authority: {
      authority_type: 'JUDGMENT',
      title: `Judgment of 26 February 2007 — ${title}`,
      case_ref: 'LCASE-ICJ-BOSNIA-SERBIA-91',
      issuing_body: 'International Court of Justice',
      date,
      document_number: documentMatch[1],
      jurisdiction_basis_refs: [
        'LAW-UN-GENOCIDE-1948',
        'JUR-ICJ',
      ],
      holding_summary: holdings,
      source: {
        url: sourceUrl,
        source_ref: 'SRC-AWS-ICJ',
        source_role: 'JUDGMENT',
      },
      research_state: 'CANONICAL',
    },
  };
}

export class AwsIcjAdapter {
  constructor(
    private readonly http = new AwsOfficialSourceHttpClient(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async fetchBosniaSerbiaCase(): Promise<AwsVerifiedSourceSnapshot> {
    const html = await this.http.getText(AWS_ICJ_BOSNIA_SERBIA_CASE_URL, {
      allowedOrigins: [AWS_ICJ_ORIGIN],
      maxBytes: 4 * 1024 * 1024,
    });

    return {
      sourceId: 'SRC-AWS-ICJ',
      sourceUrl: AWS_ICJ_BOSNIA_SERBIA_CASE_URL,
      capturedAt: this.now().toISOString(),
      payload: parseIcjBosniaSerbiaCasePage(html),
    };
  }

  async fetchBosniaSerbiaJudgment(): Promise<AwsVerifiedSourceSnapshot> {
    const html = await this.http.getText(AWS_ICJ_BOSNIA_SERBIA_JUDGMENT_URL, {
      allowedOrigins: [AWS_ICJ_ORIGIN],
      maxBytes: 8 * 1024 * 1024,
    });

    return {
      sourceId: 'SRC-AWS-ICJ',
      sourceUrl: AWS_ICJ_BOSNIA_SERBIA_JUDGMENT_URL,
      capturedAt: this.now().toISOString(),
      payload: parseIcjBosniaSerbiaJudgmentPage(html),
    };
  }
}
