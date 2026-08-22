export type JsonValue = string|number|boolean|null|JsonValue[]|{[key:string]:JsonValue}; export type JsonObject=Record<string,JsonValue>;
export interface UniverseObservationRequest{ text?:string; source?:string; payload?:JsonObject; context?:JsonObject; mode?:'semantic'|'full'; entityId?:string; }
export interface UniverseAnalysisRequest{ observation?:UniverseObservationRequest; caseId?:string; options?:JsonObject; semanticObservation?:JsonObject; }
export interface UniverseEvaluationRequest{ target?:string; input?:JsonObject; mode?:'mizan'|'full'; semanticObservation?:JsonObject; }
export interface UniverseCommandRequest{ command:string; target?:string; payload?:JsonObject; }
export interface UniverseQueryRequest{ query?:string; type?:string; entityId?:string; limit?:number; }
export type EvidenceStatus='OBSERVED'|'SUPPORTED'|'VERIFIED'|'CORROBORATED'|'INFERRED'|'UNKNOWN'|'CONFLICTED';
export interface EvidenceAttachmentRequest{ evidenceId?:string; sourceType?:string; reference?:string; status?:EvidenceStatus; confidence?:number; payload?:JsonObject; supersedes?:string; supersessionReason?:string; }
export interface EvidenceRecord{ evidenceId:string; entityId:string; sourceType:string; reference?:string; status?:EvidenceStatus; confidence?:number; payload:JsonObject; supersedes?:string; supersededBy?:string; createdAt?:string; updatedAt?:string; createdBy?:string|null; updatedBy?:string|null; version?:number; }
export type ReviewDecision='ALLOW_ANALYTICAL_DISPLAY'|'REQUIRE_HUMAN_REVIEW'|'BLOCK_ADVERSE_ACTION';
export interface HumanReviewReason{code:string;detail:string;evidenceRefs:string[]}
export interface HumanReviewGate{protocol:'HUMAN_REVIEW_GATE_V1';decision:ReviewDecision;analyticalDisplayAllowed:true;adverseActionBlocked:true;requiresHumanReview:boolean;severity:'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';reasons:HumanReviewReason[];evidenceGap:string[];recommendedReviewActions:string[];boundary:string}
export interface WitnessReference{nodeId:string;hash:string;root:string;checkpointId?:string|null}
export type ReviewStatus='QUEUED'|'ASSIGNED'|'ACKNOWLEDGED'|'EVIDENCE_REQUESTED'|'DISPOSED'|'ESCALATED'|'REOPENED';
export type HumanDisposition='UPHOLD_GATE'|'ALLOW_ANALYTICAL_DISPLAY'|'REQUEST_MORE_EVIDENCE'|'ESCALATE';
export interface ReviewRecord{reviewId:string;targetId:string;status:ReviewStatus;requestedBy:string;assigneeId?:string|null;gateDecision:ReviewDecision|string;evidenceRefs:string[];rationale?:string;disposition?:HumanDisposition|null;createdAt:string;updatedAt:string;version:number}
export interface ReviewCreateRequest{targetId:string;assigneeId?:string;gateDecision?:ReviewDecision;evidenceRefs?:string[]}
export interface ReviewTransitionRequest{status:ReviewStatus;assigneeId?:string;rationale?:string;disposition?:HumanDisposition}
export interface AnalysisResultContract extends UniverseRecord{text?:string;caseId?:string;semanticVector?:JsonObject|null;mizan?:JsonObject|null;lifecycle?:JsonObject|null;reviewGate?:HumanReviewGate;revelationScorecard?:JsonObject|null;witness?:WitnessReference|null}
export interface UniverseEvaluationResponse extends AnalysisResultContract{kind:'EVALUATION';status:'RESOLVED'|'REVIEW_REQUIRED'|'BLOCKED';reviewGate:HumanReviewGate}
export interface UniverseRecord{ id:string; kind:string; status?:string; [key:string]:unknown; }
export interface ApiErrorBody{error:string;message?:string;requestId?:string}

export function isHumanReviewGate(value: unknown): value is HumanReviewGate {
  if (!value || typeof value !== 'object') return false;
  const gate = value as Record<string, unknown>;
  return gate.protocol === 'HUMAN_REVIEW_GATE_V1'
    && typeof gate.decision === 'string'
    && gate.analyticalDisplayAllowed === true
    && gate.adverseActionBlocked === true
    && typeof gate.requiresHumanReview === 'boolean'
    && typeof gate.severity === 'string'
    && Array.isArray(gate.reasons)
    && Array.isArray(gate.evidenceGap)
    && Array.isArray(gate.recommendedReviewActions)
    && typeof gate.boundary === 'string';
}
