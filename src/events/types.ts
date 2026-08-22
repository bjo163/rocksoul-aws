export type EventOccurrence='ASSERTED'|'REPORTED'|'NEGATED'|'CONTEXT_INVALIDATED'|'UNRESOLVED';
export type KnowledgeState='KNOWN'|'UNKNOWN'|'BELIEVED'|'UPDATED'|'UNSPECIFIED';
export interface EventActionCandidate { action:string; score:number; matchedAlias:string; source:'ALIAS'|'STRUCTURAL'; suppressed?:boolean; suppressionReason?:string; }
export interface SemanticEventNode {
  id:string; sequence:number; text:string; connector:string|null;
  actor:string|null; patient:string|null; object:string|null; owner:string|null;
  occurrence:EventOccurrence;
  knowledge:{state:KnowledgeState;signals:string[]};
  context:{mistake:boolean;coercion:boolean;permission:boolean;capacityLimited:boolean;emergency:boolean;signals:string[]};
  intention:{declared:boolean;purpose:string|null;signals:string[]};
  reporting:{reported:boolean;unverified:boolean;signals:string[]};
  actions:EventActionCandidate[];
  restoration:boolean;
  lifecycleSignals:Record<string,string[]>;
  confidence:number;
}
export interface SemanticEventGraph {
  protocol:string; version:string; text:string; nodes:SemanticEventNode[];
  relations:Array<{from:string;to:string;type:'SEQUENCE'|'CONTRAST'|'CAUSE'|'PURPOSE'|'RESTORES'}>;
  summary:{eventCount:number;assertedCount:number;reportedCount:number;negatedCount:number;restorationCount:number;hasMistake:boolean;hasCoercion:boolean;hasPermission:boolean;hasPrincipleConflictCandidate:boolean};
  boundary:string;
}
