export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

export interface UniverseObservationRequest { text?: string; source?: string; payload?: JsonObject; context?: JsonObject; mode?: 'semantic' | 'full'; entityId?: string }
export interface UniverseAnalysisRequest { observation?: UniverseObservationRequest; text?: string; caseId?: string; options?: JsonObject; semanticObservation?: JsonObject }
export interface UniverseEvaluationRequest { target?: string; text?: string; input?: JsonObject; mode?: 'mizan' | 'full'; semanticObservation?: JsonObject }
export interface UniverseCommandRequest { command: string; target?: string; payload?: JsonObject }
export interface UniverseQueryRequest { query?: string; type?: string; entityId?: string; limit?: number }

export type EvidenceStatus = 'OBSERVED' | 'SUPPORTED' | 'VERIFIED' | 'CORROBORATED' | 'INFERRED' | 'UNKNOWN' | 'CONFLICTED';
export interface EvidenceAttachmentRequest { evidenceId?: string; sourceType?: string; reference?: string; status?: EvidenceStatus; confidence?: number; payload?: JsonObject; supersedes?: string; supersessionReason?: string }
export interface EvidenceRecord { evidenceId: string; entityId: string; sourceType: string; reference?: string; status?: EvidenceStatus; confidence?: number; payload: JsonObject; supersedes?: string; supersededBy?: string; createdAt?: string; updatedAt?: string; createdBy?: string | null; updatedBy?: string | null; version?: number }

export type ReviewDecision = 'ALLOW_ANALYTICAL_DISPLAY' | 'REQUIRE_HUMAN_REVIEW' | 'BLOCK_ADVERSE_ACTION';
export interface HumanReviewReason { code: string; detail: string; evidenceRefs: string[] }
export interface HumanReviewGate { protocol: 'HUMAN_REVIEW_GATE_V1'; decision: ReviewDecision; analyticalDisplayAllowed: true; adverseActionBlocked: true; requiresHumanReview: boolean; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; reasons: HumanReviewReason[]; evidenceGap: string[]; recommendedReviewActions: string[]; boundary: string }
export interface WitnessReference { nodeId: string; hash: string; root: string; checkpointId?: string | null }

export type ReviewStatus = 'QUEUED' | 'ASSIGNED' | 'ACKNOWLEDGED' | 'EVIDENCE_REQUESTED' | 'DISPOSED' | 'ESCALATED' | 'REOPENED';
export type HumanDisposition = 'UPHOLD_GATE' | 'ALLOW_ANALYTICAL_DISPLAY' | 'REQUEST_MORE_EVIDENCE' | 'ESCALATE';
export interface ReviewRecord { reviewId: string; targetId: string; status: ReviewStatus; requestedBy: string; assigneeId?: string | null; gateDecision: ReviewDecision | string; evidenceRefs: string[]; rationale?: string; disposition?: HumanDisposition | null; createdAt: string; updatedAt: string; version: number }
export interface ReviewCreateRequest { targetId: string; assigneeId?: string; gateDecision?: ReviewDecision; evidenceRefs?: string[] }
export interface ReviewTransitionRequest { status: ReviewStatus; assigneeId?: string; rationale?: string; disposition?: HumanDisposition }

export interface UniverseRecord { id: string; kind: string; status?: string; [key: string]: unknown }
export interface AnalysisResultContract extends UniverseRecord { kind: 'ANALYSIS'; text?: string; caseId?: string; semanticVector?: JsonObject | null; semantic?: JsonObject | null; mizan: JsonObject | null; lifecycle: JsonObject | null; reviewGate: HumanReviewGate; revelationScorecard: JsonObject | null; witness: WitnessReference }
export interface UniverseEvaluationResponse extends Omit<AnalysisResultContract, 'kind' | 'status'> { kind: 'EVALUATION'; status: 'RESOLVED' | 'REVIEW_REQUIRED' | 'BLOCKED'; reviewGate: HumanReviewGate }
export interface UniverseObservationResponse extends UniverseRecord { kind: 'OBSERVATION'; status: 'RECORDED'; entityId: string; event: Record<string, unknown> }
export interface UniverseQueryResponse { type: 'ENTITY'; result: unknown | null }
export interface UniverseQueryListResponse { type: 'ENTITIES'; results: unknown[] }
export interface EvidenceAttachmentResponse { id: string; status: string; evidence: EvidenceRecord; reanalysisRequired: boolean }
export interface EvidenceListResponse { id: string; evidence: EvidenceRecord[] }

export interface XrpEvidenceSummary { id: string; status: EvidenceStatus; sourceType: string; reference?: string; confidence?: number | null; superseded?: boolean }
export interface XrpReviewSummary { reviewId: string; status: ReviewStatus; gateDecision: string; updatedAt: string }
export interface XrpWitnessSummary { state: 'VALID' | 'PENDING'; hash: string | null; root: null; nodeCount: number; checkpointId: null }
export interface XrpCaseSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  evidence: XrpEvidenceSummary[];
  reviews: XrpReviewSummary[];
  reviewGate: HumanReviewGate | null;
  witness: XrpWitnessSummary;
}
export interface XrpWorkItemSummary { id: string; type: 'PROJECT' | 'TASK' | 'RESOURCE'; title: string; status: string; dueAt?: string; updatedAt: string }
export interface XrpWorkspaceResponse {
  protocol: 'MW_XRP_WORKSPACE_V1';
  rid: string;
  generatedAt: string;
  summary: { activeCases: number; awaitingReview: number; verifiedEvidence: number; dueTasks: number };
  cases: XrpCaseSummary[];
  workItems: XrpWorkItemSummary[];
}
export interface XrpCreateResponse { id: string; status: 'OBSERVED'; version: number }
export interface XrpEvidenceCreateResponse { id: string; status: 'EVIDENCE_RECORDED'; evidence: { id: string; status: EvidenceStatus; sourceType: string; reference?: string }; reanalysisRequired: true }
export interface XrpWorkItemCreateResponse { id: string; type: 'PROJECT' | 'TASK' | 'RESOURCE'; status: 'OPEN'; version: number }

export interface FlowNodeContract { id: string; kind: string; label: string }
export interface FlowWorkflowContract {
  id: string;
  ownerRid: string;
  name: string;
  version: number;
  status: 'DRAFT' | 'WITNESS_PENDING' | 'REVIEW_REQUIRED';
  nodes: FlowNodeContract[];
  edges: string[][];
  reviewGate: { decision: 'REVIEW_REQUIRED'; requiresHumanReview: true; adverseActionBlocked: true };
  witness: { state: 'PENDING' | 'VALID'; hash?: string | null; root?: string | null; checkpointId?: string | null };
  updatedAt: string;
}
export interface FlowListResponse { workflows: FlowWorkflowContract[] }
export interface FlowReviewResponse { workflow: FlowWorkflowContract; review: { reviewId: string; status: ReviewStatus }; witness: WitnessReference }

export interface PublicUserContract { userId: string; username: string; rid: string | null; roles: string[]; active: boolean; lastSeen?: string; isOnline?: boolean }
export interface AuthSessionContract { protocol: 'MW_AUTH_SESSION_V1'; transport: 'cookie' | 'bearer'; token?: string; accessToken?: string; refreshToken?: string; expiresAt: string; refreshExpiresAt: string; sessionId: string; user: PublicUserContract }
export interface AuthLoginRequest { username: string; password: string }
export interface AuthRefreshRequest { refreshToken?: string }
export interface AuthLogoutResponse { ok: boolean }

export interface ApiErrorBody { error: string; message?: string; requestId?: string; request_id?: string }

export class ContractValidationError extends Error {
  readonly contract: string;
  readonly issues: string[];
  constructor(contract: string, issues: string[]) {
    super(`${contract}: ${issues.join('; ')}`);
    this.name = 'ContractValidationError';
    this.contract = contract;
    this.issues = issues;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function requireRecord(value: unknown, contract: string): Record<string, unknown> {
  const result = record(value);
  if (!result) throw new ContractValidationError(contract, ['expected object']);
  return result;
}

function requireString(value: unknown, field: string, issues: string[]): void {
  if (typeof value !== 'string' || !value) issues.push(`${field} must be a non-empty string`);
}

function requireBoolean(value: unknown, field: string, issues: string[]): void {
  if (typeof value !== 'boolean') issues.push(`${field} must be boolean`);
}

function requireIsoDate(value: unknown, field: string, issues: string[]): void {
  if (typeof value !== 'string' || !value || Number.isNaN(Date.parse(value))) issues.push(`${field} must be an ISO date`);
}

export function isHumanReviewGate(value: unknown): value is HumanReviewGate {
  const gate = record(value);
  if (!gate) return false;
  if (gate.protocol !== 'HUMAN_REVIEW_GATE_V1') return false;
  if (!['ALLOW_ANALYTICAL_DISPLAY', 'REQUIRE_HUMAN_REVIEW', 'BLOCK_ADVERSE_ACTION'].includes(String(gate.decision))) return false;
  if (gate.analyticalDisplayAllowed !== true || gate.adverseActionBlocked !== true) return false;
  if (typeof gate.requiresHumanReview !== 'boolean') return false;
  if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(gate.severity))) return false;
  if (!Array.isArray(gate.reasons) || !gate.reasons.every((reason) => {
    const item = record(reason);
    return item && typeof item.code === 'string' && typeof item.detail === 'string' && stringArray(item.evidenceRefs);
  })) return false;
  return stringArray(gate.evidenceGap) && stringArray(gate.recommendedReviewActions) && typeof gate.boundary === 'string';
}

export function assertHumanReviewGate(value: unknown): asserts value is HumanReviewGate {
  if (!isHumanReviewGate(value)) throw new ContractValidationError('HumanReviewGate', ['invalid HUMAN_REVIEW_GATE_V1 payload']);
}

function refs(observed: unknown, scorecard: unknown): string[] {
  const o = record(observed) ?? {};
  const s = record(scorecard) ?? {};
  const quranGrounding = record(o.quranGrounding) ?? {};
  const grounding = record(s.grounding) ?? {};
  return [...new Set([
    ...(Array.isArray(quranGrounding.direct) ? quranGrounding.direct : []),
    ...(Array.isArray(quranGrounding.principles) ? quranGrounding.principles : []),
    ...(Array.isArray(grounding.refs) ? grounding.refs : [])
  ].map(String).filter(Boolean))];
}

export function buildHumanReviewGate(input: { observed?: unknown; quranicMizan?: unknown; scorecard?: unknown; conflicts?: unknown[] } = {}): HumanReviewGate {
  const q = (record(input.quranicMizan) ?? {}) as Record<string, any>;
  const s = (record(input.scorecard) ?? {}) as Record<string, any>;
  const o = (record(input.observed) ?? {}) as Record<string, any>;
  const eventResolution = (record(o?.eventInterpretation)?.conflictResolution) ?? null;
  const actualConflict = (eventResolution && String(record(eventResolution)?.state).toUpperCase() === 'ACTUAL_CONFLICT') ||
    (Array.isArray(input.conflicts) && input.conflicts.some((conflict) => String(record(conflict)?.status ?? '').toUpperCase() === 'ACTUAL_CONFLICT')) ||
    Boolean(q?.epistemic?.conflictPresent);
  const status = String(q?.status ?? 'UNKNOWN').toUpperCase();
  const evidenceState = String(q?.epistemic?.evidenceState ?? 'INSUFFICIENT').toUpperCase();
  const quranCoverage = String(q?.quranGrounding?.coverage ?? o?.quranGrounding?.coverage ?? 'NONE').toUpperCase();
  const evidenceRefs = refs(o, s);
  const reasons: HumanReviewReason[] = [];
  const evidenceGap: string[] = [];
  const reviewActions: string[] = [];

  if (actualConflict) {
    reasons.push({ code: 'ACTUAL_CONFLICT', detail: 'Opposing event interpretations remain unresolved; software applies no normative priority.', evidenceRefs });
    reviewActions.push('REVIEW_CONFLICTING_EVENT_SIDES');
  }
  if (status === 'RESERVED') {
    reasons.push({ code: 'FINAL_OUTCOME_RESERVED', detail: 'The input touches unseen or final outcomes reserved outside software analysis.', evidenceRefs });
    evidenceGap.push('FINAL_OUTCOME_IS_NOT_OBSERVABLE');
    reviewActions.push('REMOVE_UNSEEN_OUTCOME_CLAIM');
  }
  if (evidenceState !== 'VERIFIED') {
    reasons.push({ code: 'EVIDENCE_NOT_VERIFIED', detail: `Evidence state is ${evidenceState}; the described facts remain conditional.`, evidenceRefs });
    evidenceGap.push('VERIFY_FACTUAL_EVENT');
    reviewActions.push('VERIFY_PRIMARY_EVIDENCE');
  }
  if (quranCoverage === 'NONE') {
    reasons.push({ code: 'NO_QURAN_GROUNDING', detail: 'No sufficient Quran-primary grounding was retrieved for this analysis.', evidenceRefs });
    evidenceGap.push('REVELATION_GROUNDING');
    reviewActions.push('DO_NOT_INFER_NORMATIVE_DIRECTION');
  }
  if (o?.quranGrounding?.empiricalRequired === true) {
    reasons.push({ code: 'EMPIRICAL_BRIDGE_REQUIRED', detail: 'The available Revelation relation does not supply the empirical fact needed to conclude this case.', evidenceRefs });
    evidenceGap.push('ALLOWED_EMPIRICAL_EVIDENCE');
    reviewActions.push('SUPPLY_VERIFIABLE_EMPIRICAL_EVIDENCE');
  }
  if (status === 'PROVISIONAL') {
    reasons.push({ code: 'PROVISIONAL_FINDING', detail: 'The analytical direction is conditional and must not be treated as an established accusation.', evidenceRefs });
  }
  if (status === 'INSUFFICIENT_EVIDENCE' || status === 'UNKNOWN') {
    reasons.push({ code: 'INSUFFICIENT_EVIDENCE', detail: 'The available input is not sufficient for a stable analytical finding.', evidenceRefs });
    evidenceGap.push('CLEARER_EVENT_DESCRIPTION');
    reviewActions.push('REQUEST_CLARIFICATION');
  }

  const decision: ReviewDecision = actualConflict || status === 'RESERVED'
    ? 'BLOCK_ADVERSE_ACTION'
    : reasons.length
      ? 'REQUIRE_HUMAN_REVIEW'
      : 'ALLOW_ANALYTICAL_DISPLAY';
  const severity: HumanReviewGate['severity'] = actualConflict || status === 'RESERVED'
    ? 'CRITICAL'
    : status === 'INSUFFICIENT_EVIDENCE' || status === 'UNKNOWN'
      ? 'HIGH'
      : reasons.length > 1
        ? 'MEDIUM'
        : 'LOW';

  return {
    protocol: 'HUMAN_REVIEW_GATE_V1',
    decision,
    analyticalDisplayAllowed: true,
    adverseActionBlocked: true,
    requiresHumanReview: decision !== 'ALLOW_ANALYTICAL_DISPLAY',
    severity,
    reasons,
    evidenceGap: [...new Set(evidenceGap)],
    recommendedReviewActions: [...new Set(reviewActions)],
    boundary: 'This gate controls software display and adverse-action safety. It is not a divine verdict and does not determine final moral or unseen outcomes.'
  };
}

export function isWitnessReference(value: unknown): value is WitnessReference {
  const witness = record(value);
  return Boolean(witness && typeof witness.nodeId === 'string' && witness.nodeId && typeof witness.hash === 'string' && witness.hash && typeof witness.root === 'string' && witness.root && (witness.checkpointId === undefined || witness.checkpointId === null || typeof witness.checkpointId === 'string'));
}

export function assertPublicUser(value: unknown): asserts value is PublicUserContract {
  const user = requireRecord(value, 'PublicUser');
  const issues: string[] = [];
  requireString(user.userId, 'userId', issues);
  requireString(user.username, 'username', issues);
  if (user.rid !== null && typeof user.rid !== 'string') issues.push('rid must be string or null');
  if (!stringArray(user.roles)) issues.push('roles must be a string array');
  requireBoolean(user.active, 'active', issues);
  if (user.lastSeen !== undefined) requireIsoDate(user.lastSeen, 'lastSeen', issues);
  if (user.isOnline !== undefined) requireBoolean(user.isOnline, 'isOnline', issues);
  if (issues.length) throw new ContractValidationError('PublicUser', issues);
}

export function assertAuthSession(value: unknown): asserts value is AuthSessionContract {
  const session = requireRecord(value, 'AuthSession');
  const issues: string[] = [];
  if (session.protocol !== 'MW_AUTH_SESSION_V1') issues.push('protocol must be MW_AUTH_SESSION_V1');
  if (session.transport !== 'cookie' && session.transport !== 'bearer') issues.push('transport must be cookie or bearer');
  if (session.transport === 'bearer') {
    requireString(session.token, 'token', issues);
    requireString(session.accessToken, 'accessToken', issues);
    requireString(session.refreshToken, 'refreshToken', issues);
    if (session.token !== session.accessToken) issues.push('token compatibility alias must equal accessToken');
  } else if (session.token !== undefined || session.accessToken !== undefined || session.refreshToken !== undefined) {
    issues.push('cookie transport must not expose tokens in JSON');
  }
  requireIsoDate(session.expiresAt, 'expiresAt', issues);
  requireIsoDate(session.refreshExpiresAt, 'refreshExpiresAt', issues);
  requireString(session.sessionId, 'sessionId', issues);
  try { assertPublicUser(session.user); } catch (error) { issues.push(error instanceof Error ? error.message : String(error)); }
  if (issues.length) throw new ContractValidationError('AuthSession', issues);
}

export function assertAnalysisResult(value: unknown, expectedKind: 'ANALYSIS' | 'EVALUATION' = 'ANALYSIS'): asserts value is AnalysisResultContract | UniverseEvaluationResponse {
  const analysis = requireRecord(value, expectedKind === 'ANALYSIS' ? 'AnalysisResult' : 'EvaluationResult');
  const issues: string[] = [];
  requireString(analysis.id, 'id', issues);
  if (analysis.kind !== expectedKind) issues.push(`kind must be ${expectedKind}`);
  requireString(analysis.status, 'status', issues);
  if (expectedKind === 'EVALUATION' && !['RESOLVED', 'REVIEW_REQUIRED', 'BLOCKED'].includes(String(analysis.status))) issues.push('invalid evaluation status');
  if (!('mizan' in analysis) || (analysis.mizan !== null && !record(analysis.mizan))) issues.push('mizan must be object or null');
  if (!('lifecycle' in analysis) || (analysis.lifecycle !== null && !record(analysis.lifecycle))) issues.push('lifecycle must be object or null');
  if (!('revelationScorecard' in analysis) || (analysis.revelationScorecard !== null && !record(analysis.revelationScorecard))) issues.push('revelationScorecard must be object or null');
  if (!isHumanReviewGate(analysis.reviewGate)) issues.push('reviewGate is invalid');
  if (!isWitnessReference(analysis.witness)) issues.push('witness is invalid');
  if (issues.length) throw new ContractValidationError(expectedKind === 'ANALYSIS' ? 'AnalysisResult' : 'EvaluationResult', issues);
}

export function assertReviewRecord(value: unknown): asserts value is ReviewRecord {
  const review = requireRecord(value, 'ReviewRecord');
  const issues: string[] = [];
  requireString(review.reviewId, 'reviewId', issues);
  requireString(review.targetId, 'targetId', issues);
  requireString(review.status, 'status', issues);
  requireString(review.requestedBy, 'requestedBy', issues);
  if (!stringArray(review.evidenceRefs)) issues.push('evidenceRefs must be a string array');
  requireIsoDate(review.createdAt, 'createdAt', issues);
  requireIsoDate(review.updatedAt, 'updatedAt', issues);
  if (typeof review.version !== 'number') issues.push('version must be number');
  if (issues.length) throw new ContractValidationError('ReviewRecord', issues);
}

export function assertXrpWorkspace(value: unknown): asserts value is XrpWorkspaceResponse {
  const workspace = requireRecord(value, 'XrpWorkspace');
  const issues: string[] = [];
  if (workspace.protocol !== 'MW_XRP_WORKSPACE_V1') issues.push('protocol must be MW_XRP_WORKSPACE_V1');
  requireString(workspace.rid, 'rid', issues);
  requireIsoDate(workspace.generatedAt, 'generatedAt', issues);
  const summary = record(workspace.summary);
  if (!summary || !['activeCases', 'awaitingReview', 'verifiedEvidence', 'dueTasks'].every((key) => typeof summary[key] === 'number')) issues.push('summary counters must be numbers');
  if (!Array.isArray(workspace.cases) || !workspace.cases.every((item) => {
    const entry = record(item);
    return Boolean(entry && typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.status === 'string' && typeof entry.updatedAt === 'string' && Array.isArray(entry.evidence) && Array.isArray(entry.reviews) && record(entry.witness));
  })) issues.push('cases must contain sanitized case summaries');
  if (!Array.isArray(workspace.workItems) || !workspace.workItems.every((item) => {
    const entry = record(item);
    return Boolean(entry && typeof entry.id === 'string' && ['PROJECT', 'TASK', 'RESOURCE'].includes(String(entry.type)) && typeof entry.title === 'string' && typeof entry.status === 'string' && typeof entry.updatedAt === 'string');
  })) issues.push('workItems must contain sanitized work-item summaries');
  if (issues.length) throw new ContractValidationError('XrpWorkspace', issues);
}

function assertFlowWorkflow(value: unknown): asserts value is FlowWorkflowContract {
  const workflow = requireRecord(value, 'FlowWorkflow');
  const issues: string[] = [];
  requireString(workflow.id, 'id', issues);
  requireString(workflow.ownerRid, 'ownerRid', issues);
  requireString(workflow.name, 'name', issues);
  if (typeof workflow.version !== 'number') issues.push('version must be number');
  if (!['DRAFT', 'WITNESS_PENDING', 'REVIEW_REQUIRED'].includes(String(workflow.status))) issues.push('status is invalid');
  if (!Array.isArray(workflow.nodes) || !workflow.nodes.every((item) => {
    const node = record(item);
    return Boolean(node && typeof node.id === 'string' && typeof node.kind === 'string' && typeof node.label === 'string');
  })) issues.push('nodes must contain id, kind, and label');
  if (!Array.isArray(workflow.edges) || !workflow.edges.every((edge) => stringArray(edge) && edge.length === 2)) issues.push('edges must contain string pairs');
  const reviewGate = record(workflow.reviewGate);
  if (!reviewGate || reviewGate.decision !== 'REVIEW_REQUIRED' || reviewGate.requiresHumanReview !== true || reviewGate.adverseActionBlocked !== true) issues.push('reviewGate must preserve human authority');
  const witness = record(workflow.witness);
  if (!witness || !['PENDING', 'VALID'].includes(String(witness.state))) issues.push('witness state is invalid');
  requireIsoDate(workflow.updatedAt, 'updatedAt', issues);
  if (issues.length) throw new ContractValidationError('FlowWorkflow', issues);
}

export function assertApiResponseContract(method: string, path: string, value: unknown): void {
  const normalizedMethod = method.toUpperCase();
  const exact = new Set(['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/register', '/api/v1/auth/provision', '/api/v1/auth/bind-rid', '/api/v1/auth/me', '/api/v1/auth/logout', '/api/v1/observe', '/api/v1/analyze', '/api/v1/evaluate', '/api/v1/query', '/api/v1/command', '/api/v1/reviews', '/api/v1/xrp/workspace', '/api/v1/xrp/cases', '/api/v1/xrp/work-items', '/api/v1/flow/workflows']);
  const dynamic = /^\/api\/v1\/resource\/[^/]+(?:\/evidence)?$/.test(path) || /^\/api\/v1\/reviews\/[^/]+\/transition$/.test(path) || /^\/api\/v1\/xrp\/cases\/[^/]+\/(?:evidence|request-review)$/.test(path) || /^\/api\/v1\/flow\/workflows\/[^/]+\/request-review$/.test(path);
  if (!exact.has(path) && !dynamic) return;
  const body = requireRecord(value, `${normalizedMethod} ${path}`);
  if (path === '/api/v1/auth/login' || path === '/api/v1/auth/refresh') return assertAuthSession(body);
  if (path === '/api/v1/auth/register' || path === '/api/v1/auth/provision' || path === '/api/v1/auth/bind-rid' || path === '/api/v1/auth/me') return assertPublicUser(body);
  if (path === '/api/v1/auth/logout') {
    if (typeof body.ok !== 'boolean') throw new ContractValidationError('AuthLogout', ['ok must be boolean']);
    return;
  }
  if (path === '/api/v1/xrp/workspace') return assertXrpWorkspace(body);
  if (path === '/api/v1/xrp/cases') {
    const issues: string[] = [];
    requireString(body.id, 'id', issues);
    if (body.status !== 'OBSERVED') issues.push('status must be OBSERVED');
    if (typeof body.version !== 'number') issues.push('version must be number');
    if (issues.length) throw new ContractValidationError('XrpCreateResponse', issues);
    return;
  }
  if (path === '/api/v1/xrp/work-items') {
    const issues: string[] = [];
    requireString(body.id, 'id', issues);
    if (!['PROJECT', 'TASK', 'RESOURCE'].includes(String(body.type))) issues.push('type is invalid');
    if (body.status !== 'OPEN') issues.push('status must be OPEN');
    if (typeof body.version !== 'number') issues.push('version must be number');
    if (issues.length) throw new ContractValidationError('XrpWorkItemCreateResponse', issues);
    return;
  }
  if (/^\/api\/v1\/xrp\/cases\/[^/]+\/evidence$/.test(path)) {
    if (typeof body.id !== 'string' || body.status !== 'EVIDENCE_RECORDED' || !record(body.evidence) || body.reanalysisRequired !== true) throw new ContractValidationError('XrpEvidenceCreateResponse', ['id, status, evidence, and reanalysisRequired are required']);
    return;
  }
  if (/^\/api\/v1\/xrp\/cases\/[^/]+\/request-review$/.test(path)) return assertReviewRecord(body);
  if (path === '/api/v1/flow/workflows') {
    if (normalizedMethod === 'GET') {
      if (!Array.isArray(body.workflows)) throw new ContractValidationError('FlowListResponse', ['workflows[] is required']);
      for (const workflow of body.workflows) assertFlowWorkflow(workflow);
    } else assertFlowWorkflow(body);
    return;
  }
  if (/^\/api\/v1\/flow\/workflows\/[^/]+\/request-review$/.test(path)) {
    assertFlowWorkflow(body.workflow);
    const review = requireRecord(body.review, 'FlowReviewSummary');
    const witness = requireRecord(body.witness, 'FlowWitness');
    if (typeof review.reviewId !== 'string' || typeof review.status !== 'string' || !isWitnessReference(witness)) throw new ContractValidationError('FlowReviewResponse', ['workflow, review, and witness are required']);
    return;
  }
  if (path === '/api/v1/observe') {
    const issues: string[] = [];
    requireString(body.id, 'id', issues); requireString(body.entityId, 'entityId', issues);
    if (body.kind !== 'OBSERVATION') issues.push('kind must be OBSERVATION');
    if (body.status !== 'RECORDED') issues.push('status must be RECORDED');
    if (!record(body.event)) issues.push('event must be object');
    if (issues.length) throw new ContractValidationError('ObservationResponse', issues);
    return;
  }
  if (path === '/api/v1/analyze') return assertAnalysisResult(body, 'ANALYSIS');
  if (path === '/api/v1/evaluate') return assertAnalysisResult(body, 'EVALUATION');
  if (path === '/api/v1/query') {
    if (body.type === 'ENTITY' && 'result' in body) return;
    if (body.type === 'ENTITIES' && Array.isArray(body.results)) return;
    throw new ContractValidationError('QueryResponse', ['expected ENTITY/result or ENTITIES/results']);
  }
  if (path === '/api/v1/command') return;
  if (/^\/api\/v1\/resource\/[^/]+$/.test(path)) {
    if (body.kind !== 'RESOURCE' || typeof body.id !== 'string' || !record(body.entity)) throw new ContractValidationError('ResourceResponse', ['id, kind RESOURCE, and entity are required']);
    return;
  }
  if (/^\/api\/v1\/resource\/[^/]+\/evidence$/.test(path)) {
    if (normalizedMethod === 'GET') {
      if (typeof body.id !== 'string' || !Array.isArray(body.evidence)) throw new ContractValidationError('EvidenceListResponse', ['id and evidence[] are required']);
    } else if (typeof body.id !== 'string' || typeof body.status !== 'string' || !record(body.evidence) || typeof body.reanalysisRequired !== 'boolean') {
      throw new ContractValidationError('EvidenceAttachmentResponse', ['id, status, evidence, and reanalysisRequired are required']);
    }
    return;
  }
  if (path === '/api/v1/reviews') {
    if (normalizedMethod === 'GET') {
      if (!Array.isArray(body.reviews)) throw new ContractValidationError('ReviewListResponse', ['reviews[] is required']);
    } else assertReviewRecord(body);
    return;
  }
  if (/^\/api\/v1\/reviews\/[^/]+\/transition$/.test(path)) return assertReviewRecord(body);
}
export * from './mizan.js';
