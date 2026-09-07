import { awsHtmlToText, parseAwsEnglishDate } from './html-normalization.js';
import {
  createAwsActorRef,
  type AwsTreatyActionCandidate,
} from './treaty-actions.js';

function action(
  actorName: string,
  type: AwsTreatyActionCandidate['action'],
  actionDate: string | null,
  text: string,
  sourceUrl: string,
  retrievedAt: string,
): AwsTreatyActionCandidate {
  return {
    instrument_ref: 'LAW-UN-GENOCIDE-1948',
    actor_ref: createAwsActorRef(actorName),
    actor_name: actorName,
    action: type,
    action_date: actionDate,
    effective_date: null,
    text,
    source: {
      url: sourceUrl,
      retrieved_at: retrievedAt,
      depositary_notification_id: null,
      sha256: null,
    },
    research_state: 'CROSS_CHECKED',
  };
}

function parseDate(value: string): string | null {
  return parseAwsEnglishDate(value.replace(/\s+/g, ' ').trim());
}

/**
 * Narrow, explicit normalizer for high-value legal notices on the UNTC
 * Genocide Convention status page.
 *
 * It intentionally does not attempt to infer every footnote or every
 * reservation from arbitrary prose. Unknown/missing dates remain null.
 */
export function parseUntcGenocideLegalNotices(
  html: string,
  retrievedAt: string,
  sourceUrl: string,
): AwsTreatyActionCandidate[] {
  const text = awsHtmlToText(html);
  const notices: AwsTreatyActionCandidate[] = [];

  const china = text.match(
    /China\s+Declaration:\s*([\s\S]*?)Reservation:\s*([\s\S]*?)(?=Czech Republic|Finland|Hungary)/i,
  );
  if (china) {
    const participationDate = text.match(/China[^\d]*(20\s+Jul\s+1949)[^\d]*(18\s+Apr\s+1983)/i);
    notices.push(
      action(
        'China',
        'declaration',
        participationDate ? parseDate(participationDate[2]) : null,
        china[1].trim(),
        sourceUrl,
        retrievedAt,
      ),
    );
    notices.push(
      action(
        'China',
        'reservation',
        participationDate ? parseDate(participationDate[2]) : null,
        china[2].trim(),
        sourceUrl,
        retrievedAt,
      ),
    );
  }

  const serbiaReservation = text.match(
    /Serbia[^\n]*Reservation:\s*([\s\S]*?)(?=Singapore|Slovakia|Spain|Ukraine|United Arab Emirates)/i,
  );
  if (serbiaReservation) {
    const accession = text.match(/Serbia[^\d]*(12\s+Mar\s+2001)\s+a/i);
    notices.push(
      action(
        'Serbia',
        'reservation',
        accession ? parseDate(accession[1]) : null,
        serbiaReservation[1].trim(),
        sourceUrl,
        retrievedAt,
      ),
    );
  }

  const bosniaObjection = text.match(
    /Bosnia-Herzegovina\s*\((27\s+December\s+2001)\):\s*([\s\S]*?)(?=17The Secretary-General|The Secretary-General received on 9 November 1981|On 9 November 1981)/i,
  );
  if (bosniaObjection) {
    notices.push(
      action(
        'Bosnia and Herzegovina',
        'objection',
        parseDate(bosniaObjection[1]),
        bosniaObjection[2].trim(),
        sourceUrl,
        retrievedAt,
      ),
    );
  }

  const spainWithdrawal = text.match(
    /On\s+(24\s+September\s+2009),\s+the Government of Spain[\s\S]*?withdraw the reservation[^.]*article IX[^.]*\./i,
  );
  if (spainWithdrawal) {
    notices.push(
      action(
        'Spain',
        'withdrawal',
        parseDate(spainWithdrawal[1]),
        spainWithdrawal[0].trim(),
        sourceUrl,
        retrievedAt,
      ),
    );
  }

  return notices;
}
