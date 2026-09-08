import type { AwsLegalRecord, AwsLegalRecordKind, AwsLegalStore } from './legal-store.js';

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function payloadObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export interface AwsCaseBundle {
  case: AwsLegalRecord;
  graph: {
    relations: Awaited<ReturnType<AwsLegalStore['listRelations']>>;
    nodes: AwsLegalRecord[];
  };
  legal: {
    instruments: AwsLegalRecord[];
    jurisdictions: AwsLegalRecord[];
    treaty_actions: AwsLegalRecord[];
    authorities: AwsLegalRecord[];
    holdings: AwsLegalRecord[];
    applicability: AwsLegalRecord[];
    claims: AwsLegalRecord[];
    claim_assessments: AwsLegalRecord[];
    case_syntheses: AwsLegalRecord[];
    assessments: AwsLegalRecord[];
  };
  foreign_refs: AwsLegalRecord[];
}

export class AwsQueryService {
  constructor(private readonly store: AwsLegalStore) {}

  async getCase(caseId: string): Promise<AwsCaseBundle | null> {
    const caseRecord = await this.store.getRecord(caseId);
    if (!caseRecord || !['CASE', 'LEGAL_CASE'].includes(caseRecord.kind)) return null;

    const payload = payloadObject(caseRecord.payload);
    const awsRefs = payloadObject(payload.aws_refs);
    const relations = await this.store.listRelations(caseId);
    const graphTargets = relations
      .filter((relation) => relation.fromId === caseId && relation.type.startsWith('CASE_HAS_'))
      .map((relation) => relation.toId);

    const explicitRefs = unique([
      ...strings(awsRefs.legal_basis),
      ...strings(awsRefs.applicability),
      ...strings(awsRefs.claims),
      ...strings(awsRefs.assessments),
      ...strings(payload.instrument_refs),
      ...strings(payload.jurisdiction_refs),
      ...strings(payload.treaty_action_refs),
      ...strings(payload.authority_refs),
      ...strings(payload.holding_refs),
      ...strings(payload.applicability_refs),
      ...strings(payload.claim_refs),
      ...strings(payload.claim_assessment_refs),
      ...strings(payload.case_synthesis_refs),
      ...strings(payload.assessment_refs),
      ...graphTargets,
    ]);

    const nodes: AwsLegalRecord[] = [];
    for (const ref of explicitRefs) {
      const record = await this.store.getRecord(ref);
      if (record) nodes.push(record);
    }

    const byKind = (kind: AwsLegalRecordKind): AwsLegalRecord[] =>
      nodes.filter((node) => node.kind === kind).sort((a, b) => a.id.localeCompare(b.id));

    return {
      case: caseRecord,
      graph: {
        relations: relations
          .filter((relation) => relation.fromId === caseId || relation.toId === caseId)
          .sort((a, b) => a.id.localeCompare(b.id)),
        nodes: [...nodes].sort((a, b) => a.id.localeCompare(b.id)),
      },
      legal: {
        instruments: byKind('INSTRUMENT'),
        jurisdictions: byKind('JURISDICTION'),
        treaty_actions: byKind('TREATY_ACTION'),
        authorities: byKind('AUTHORITY'),
        holdings: byKind('HOLDING'),
        applicability: byKind('APPLICABILITY'),
        claims: byKind('CLAIM'),
        claim_assessments: byKind('CLAIM_ASSESSMENT'),
        case_syntheses: byKind('CASE_SYNTHESIS'),
        assessments: byKind('ASSESSMENT'),
      },
      foreign_refs: byKind('FOREIGN_REF'),
    };
  }

  async getCaseGraph(caseId: string) {
    const bundle = await this.getCase(caseId);
    if (!bundle) return null;
    return {
      case_ref: caseId,
      relations: bundle.graph.relations,
      nodes: [bundle.case, ...bundle.graph.nodes],
    };
  }

  async getCaseHistory(caseId: string) {
    const record = await this.store.getRecord(caseId);
    if (!record || !['CASE', 'LEGAL_CASE'].includes(record.kind)) return null;
    const [events, audit] = await Promise.all([
      this.store.listEvents(caseId),
      this.store.listAuditRecords(caseId),
    ]);
    return {
      case_ref: caseId,
      version: record.version ?? null,
      updated_at: record.updatedAt ?? null,
      events,
      audit,
    };
  }

  async listSources() {
    const [sources, freshness] = await Promise.all([
      this.store.listRecords('SOURCE'),
      this.store.listRecords<Record<string, unknown>>('SOURCE_FRESHNESS'),
    ]);
    const freshnessBySource = new Map(
      freshness.map((item) => [String(item.payload.source_ref ?? ''), item]),
    );
    const result = [];
    for (const source of sources.sort((a, b) => a.id.localeCompare(b.id))) {
      const latest = await this.store.latestSourceRevision(source.id);
      result.push({
        source,
        freshness: freshnessBySource.get(source.id) ?? null,
        latest_revision: latest
          ? {
              revision_id: latest.revisionId,
              fingerprint: latest.fingerprint,
              captured_at: latest.capturedAt,
              source_url: latest.sourceUrl,
            }
          : null,
      });
    }
    return result;
  }

  async listSourceRevisions(sourceId: string) {
    const source = await this.store.getRecord(sourceId);
    if (!source || source.kind !== 'SOURCE') return null;
    const revisions = await this.store.listSourceRevisions(sourceId);
    return {
      source,
      revisions: revisions.map((revision) => ({
        revision_id: revision.revisionId,
        source_url: revision.sourceUrl,
        fingerprint: revision.fingerprint,
        captured_at: revision.capturedAt,
        payload: revision.payload,
      })),
    };
  }

  async listResearchRuns() {
    return (await this.store.listRecords('RESEARCH_RUN'))
      .sort((a, b) =>
        String(b.payload.started_at ?? b.updatedAt ?? '').localeCompare(
          String(a.payload.started_at ?? a.updatedAt ?? ''),
        ),
      );
  }

  async listResearchReviews() {
    return (await this.store.listRecords('RESEARCH_REVIEW'))
      .sort((a, b) =>
        String(b.payload.created_at ?? b.updatedAt ?? '').localeCompare(
          String(a.payload.created_at ?? a.updatedAt ?? ''),
        ),
      );
  }
}
