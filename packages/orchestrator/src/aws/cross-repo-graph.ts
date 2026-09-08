import crypto from 'node:crypto';
import type { AwsLegalStore } from './legal-store.js';

export type AwsForeignDomain =\n  | 'STORY'\n  | 'EVENT'\n  | 'PERSON'\n  | 'TEXT'\n  | 'PERSPECTIVE'\n  | 'RELATIONSHIP'\n  | 'RGBL'; // legacy semantic alias for TEXT
export type AwsForeignVerificationState = 'VERIFIED' | 'UNVERIFIED' | 'MISSING' | 'STALE';

export interface AwsRepositoryBinding {
  domain: AwsForeignDomain;
  repository: string;
  ref_prefix: string;
  ownership: 'FOREIGN';
}

export const AWS_FOREIGN_REPOSITORY_BINDINGS: readonly AwsRepositoryBinding[] = [
  { domain: 'STORY', repository: 'bjo163/rocksoul-mftl', ref_prefix: 'mftl:', ownership: 'FOREIGN' },
  { domain: 'EVENT', repository: 'bjo163/rocksoul-legend', ref_prefix: 'legend:', ownership: 'FOREIGN' },
  { domain: 'PERSON', repository: 'bjo163/rocksoul-superhero', ref_prefix: 'superhero:', ownership: 'FOREIGN' },
  { domain: 'RGBL', repository: 'bjo163/rocksoul-rgbl', ref_prefix: 'rgbl:', ownership: 'FOREIGN' },
] as const;

export interface AwsForeignReferenceRecord extends Record<string, unknown> {
  id: string;
  domain: AwsForeignDomain;
  canonical_ref: string;
  repository: string;
  canonical_path: string | null;
  verification: {
    state: AwsForeignVerificationState;
    commit_sha: string | null;
    verified_at: string;
    evidence_path: string | null;
    match_kind: 'CANONICAL_RECORD' | 'CANONICAL_INDEX' | 'INTEROP_CONTRACT' | 'NOT_FOUND';
  };
  ownership: 'FOREIGN';
  snapshot: Record<string, unknown> | null;
}

export type AwsCaseGraphRelation =
  | 'CASE_HAS_STORY'
  | 'CASE_HAS_EVENT'
  | 'CASE_HAS_PERSON'
  | 'CASE_HAS_RGBL'
  | 'CASE_HAS_LEGAL_BASIS'
  | 'CASE_HAS_APPLICABILITY'
  | 'CASE_HAS_CLAIM'
  | 'CASE_HAS_ASSESSMENT';

export interface AwsCaseGraphEdge {
  id: string;
  from_ref: string;
  relation: AwsCaseGraphRelation;
  to_ref: string;
}

export interface AwsCrossRepoCaseGraph extends Record<string, unknown> {
  id: string;
  case_ref: string;
  node_refs: string[];
  edges: AwsCaseGraphEdge[];
  research_state: 'CANDIDATE' | 'REVIEW_REQUIRED' | 'REVIEWED' | 'SUPERSEDED';
}

function hash24(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24).toUpperCase();
}

export function createAwsForeignRefId(domain: AwsForeignDomain, canonicalRef: string): string {
  return `XREF-${domain}-${hash24(`${domain}|${canonicalRef}`)}`;
}

export function createAwsCaseGraphEdgeId(
  caseRef: string,
  relation: AwsCaseGraphRelation,
  targetRef: string,
): string {
  return `GEDGE-${hash24(`${caseRef}|${relation}|${targetRef}`)}`;
}

export function bindingForAwsForeignDomain(
  domain: AwsForeignDomain,
  bindings: readonly AwsRepositoryBinding[] = AWS_FOREIGN_REPOSITORY_BINDINGS,
): AwsRepositoryBinding {
  const binding = bindings.find((item) => item.domain === domain);
  if (!binding) throw new Error(`AWS_FOREIGN_BINDING_MISSING:${domain}`);
  return binding;
}

export function validateAwsForeignReferenceBinding(
  record: Pick<AwsForeignReferenceRecord, 'id' | 'domain' | 'canonical_ref' | 'repository'>,
  bindings: readonly AwsRepositoryBinding[] = AWS_FOREIGN_REPOSITORY_BINDINGS,
): void {
  const binding = bindingForAwsForeignDomain(record.domain, bindings);
  if (record.repository !== binding.repository) {
    throw new Error(`AWS_FOREIGN_REPOSITORY_MISMATCH:${record.domain}`);
  }
  if (!record.canonical_ref.startsWith(binding.ref_prefix)) {
    throw new Error(`AWS_FOREIGN_PREFIX_MISMATCH:${record.domain}`);
  }
  const expectedId = createAwsForeignRefId(record.domain, record.canonical_ref);
  if (record.id !== expectedId) {
    throw new Error(`AWS_FOREIGN_ID_MISMATCH:${record.id}:${expectedId}`);
  }
}

export class AwsCrossRepoGraphService {
  constructor(
    private readonly legalStore: AwsLegalStore,
    private readonly bindings: readonly AwsRepositoryBinding[] = AWS_FOREIGN_REPOSITORY_BINDINGS,
  ) {}

  async persistForeignReference(record: AwsForeignReferenceRecord): Promise<{ changed: boolean }> {
    validateAwsForeignReferenceBinding(record, this.bindings);
    const saved = await this.legalStore.upsertRecordIfChanged('FOREIGN_REF', record.id, record);
    return { changed: saved.changed };
  }

  async persistMissingForeignReference(input: {
    domain: AwsForeignDomain;
    canonicalRef: string;
    verifiedAt: string;
  }): Promise<AwsForeignReferenceRecord> {
    const binding = bindingForAwsForeignDomain(input.domain, this.bindings);
    const record: AwsForeignReferenceRecord = {
      id: createAwsForeignRefId(input.domain, input.canonicalRef),
      domain: input.domain,
      canonical_ref: input.canonicalRef,
      repository: binding.repository,
      canonical_path: null,
      verification: {
        state: 'MISSING',
        commit_sha: null,
        verified_at: input.verifiedAt,
        evidence_path: null,
        match_kind: 'NOT_FOUND',
      },
      ownership: 'FOREIGN',
      snapshot: null,
    };
    await this.persistForeignReference(record);
    return record;
  }

  async persistCaseGraph(graph: AwsCrossRepoCaseGraph): Promise<{ changed: boolean }> {
    const caseRecord = await this.legalStore.getRecord(graph.case_ref);
    if (!caseRecord || caseRecord.kind !== 'CASE') {
      throw new Error(`AWS_CASE_GRAPH_CASE_MISSING:${graph.case_ref}`);
    }

    for (const edge of graph.edges) {
      if (edge.from_ref !== graph.case_ref) {
        throw new Error(`AWS_CASE_GRAPH_EDGE_SOURCE_MISMATCH:${edge.id}`);
      }
      const expected = createAwsCaseGraphEdgeId(graph.case_ref, edge.relation, edge.to_ref);
      if (edge.id !== expected) {
        throw new Error(`AWS_CASE_GRAPH_EDGE_ID_MISMATCH:${edge.id}:${expected}`);
      }
      const target = await this.legalStore.getRecord(edge.to_ref);
      if (!target) {
        throw new Error(`AWS_CASE_GRAPH_TARGET_MISSING:${edge.to_ref}`);
      }
    }

    const saved = await this.legalStore.upsertRecordIfChanged('CASE_GRAPH', graph.id, graph);
    await this.legalStore.linkDependency(graph.case_ref, graph.id);

    for (const edge of graph.edges) {
      await this.legalStore.linkTypedRelation(
        edge.from_ref,
        edge.relation,
        edge.to_ref,
        { graph_id: graph.id, semantics: edge.relation },
      );
      await this.legalStore.linkDependency(graph.case_ref, edge.to_ref);
    }

    return { changed: saved.changed };
  }

  async getCaseEdges(caseRef: string): Promise<AwsCaseGraphEdge[]> {
    const relations = await this.legalStore.listRelations(caseRef);
    return relations
      .filter((relation) => relation.type.startsWith('CASE_HAS_'))
      .map((relation) => ({
        id: createAwsCaseGraphEdgeId(caseRef, relation.type as AwsCaseGraphRelation, relation.toId),
        from_ref: caseRef,
        relation: relation.type as AwsCaseGraphRelation,
        to_ref: relation.toId,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  async findAffectedCasesByForeignRef(foreignRefId: string): Promise<string[]> {
    const record = await this.legalStore.getRecord(foreignRefId);
    if (!record || record.kind !== 'FOREIGN_REF') {
      throw new Error(`AWS_FOREIGN_REF_MISSING:${foreignRefId}`);
    }
    return this.legalStore.findDependentCases(foreignRefId);
  }
}
