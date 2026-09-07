import type { AwsLegalStore } from './legal-store.js';
import type { AwsSourceWorker, AwsSourceWorkerResult } from './source-worker.js';
import type { AwsIcrcAdapter } from './icrc-adapter.js';
import type { AwsUntcAdapter, AwsUntcGenocidePayload } from './untc-adapter.js';
import type { AwsIcjAdapter } from './icj-adapter.js';
import { persistAwsAuthorityCandidate } from './legal-authorities.js';
import { persistAwsTreatyActionCandidates } from './treaty-actions.js';

export interface AwsOfficialIngestionResult {
  sourceResult: AwsSourceWorkerResult;
  instrumentChanged: boolean;
  treatyActionIds: string[];
  authorityIds?: string[];
  legalCaseChanged?: boolean;
}

export class AwsOfficialSourceIngestionService {
  constructor(
    private readonly legalStore: AwsLegalStore,
    private readonly sourceWorker: AwsSourceWorker,
    private readonly icrc: AwsIcrcAdapter,
    private readonly untc: AwsUntcAdapter,
    private readonly icj?: AwsIcjAdapter,
  ) {}

  async ingestIcrcGciv(): Promise<AwsOfficialIngestionResult> {
    const snapshot = await this.icrc.fetchGciv();

    await this.legalStore.upsertRecordIfChanged('SOURCE', snapshot.sourceId, {
      canonical_url: snapshot.sourceUrl,
      authority_role: 'OFFICIAL_INSTITUTIONAL_DATABASE',
      publisher: 'International Committee of the Red Cross',
    });

    const instrument = await this.legalStore.upsertRecordIfChanged(
      'INSTRUMENT',
      'LAW-IHL-GCIV-1949',
      structuredClone(snapshot.payload),
    );
    await this.legalStore.linkDependency('LAW-IHL-GCIV-1949', snapshot.sourceId);

    const sourceResult = await this.sourceWorker.process(snapshot);
    return {
      sourceResult,
      instrumentChanged: instrument.changed,
      treatyActionIds: [],
    };
  }

  async ingestIcjBosniaSerbia(): Promise<AwsOfficialIngestionResult> {
    if (!this.icj) throw new Error('AWS_ICJ_ADAPTER_REQUIRED');

    const snapshot = await this.icj.fetchBosniaSerbiaBundle();
    const payload = snapshot.payload as {
      case: Record<string, unknown>;
      judgment: { authority: Parameters<typeof persistAwsAuthorityCandidate>[1] };
    };

    await this.legalStore.upsertRecordIfChanged('SOURCE', snapshot.sourceId, {
      canonical_url: snapshot.sourceUrl,
      authority_role: 'OFFICIAL_JUDICIAL',
      publisher: 'International Court of Justice',
    });

    const legalCase = await this.legalStore.upsertRecordIfChanged(
      'LEGAL_CASE',
      'LCASE-ICJ-BOSNIA-SERBIA-91',
      structuredClone(payload.case),
    );

    const authority = await persistAwsAuthorityCandidate(
      this.legalStore,
      payload.judgment.authority,
      'AUTH-ICJ-91-JUDGMENT-2007-02-26',
    );

    const sourceResult = await this.sourceWorker.process(snapshot);

    return {
      sourceResult,
      instrumentChanged: false,
      treatyActionIds: [],
      authorityIds: [authority.id],
      legalCaseChanged: legalCase.changed,
    };
  }

  async ingestUntcGenocideConvention(): Promise<AwsOfficialIngestionResult> {
    const snapshot = await this.untc.fetchGenocideConvention();
    const payload = snapshot.payload as AwsUntcGenocidePayload;
    const { treaty_actions: treatyActions, ...instrumentPayload } = payload;

    await this.legalStore.upsertRecordIfChanged('SOURCE', snapshot.sourceId, {
      canonical_url: snapshot.sourceUrl,
      authority_role: 'OFFICIAL_DEPOSITARY',
      publisher: 'United Nations',
    });

    const instrument = await this.legalStore.upsertRecordIfChanged(
      'INSTRUMENT',
      'LAW-UN-GENOCIDE-1948',
      structuredClone(instrumentPayload),
    );
    await this.legalStore.linkDependency('LAW-UN-GENOCIDE-1948', snapshot.sourceId);

    const sourceResult = await this.sourceWorker.process(snapshot);
    const treatyActionIds = await persistAwsTreatyActionCandidates(
      this.legalStore,
      snapshot.sourceId,
      treatyActions,
    );

    return {
      sourceResult,
      instrumentChanged: instrument.changed,
      treatyActionIds,
    };
  }
}
