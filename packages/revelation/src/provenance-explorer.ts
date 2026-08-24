export type ProvenanceTraceNodeKind =
  | 'SOURCE'
  | 'REFERENCE'
  | 'EVENT'
  | 'EVIDENCE'
  | 'RELATION'
  | 'CASE'
  | 'REVIEW'
  | 'WITNESS'
  | 'AUDIT';

export type ProvenanceTraceNode = {
  id: string;
  kind: ProvenanceTraceNodeKind;
  label: string;
  lane: 'CORE' | 'DERIVED' | 'UNRESOLVED';
  sourceClass?: string;
  provenance?: string;
};

export type ProvenanceTraceEdge = {
  id: string;
  fromId: string;
  toId: string;
  relation: string;
};

export type ProvenanceTrace = {
  protocol: 'CAB_PROVENANCE_TRACE_V1';
  rootId: string;
  nodes: ProvenanceTraceNode[];
  edges: ProvenanceTraceEdge[];
  terminalState: 'GROUNDED' | 'DERIVED' | 'UNRESOLVED' | 'INCOMPLETE';
};

type RecordValue = Record<string, unknown>;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function lane(value: unknown): ProvenanceTraceNode['lane'] {
  return value === 'CORE' || value === 'DERIVED' || value === 'UNRESOLVED' ? value : 'UNRESOLVED';
}

function laneFromGrounding(value: unknown): ProvenanceTraceNode['lane'] {
  if (value === 'EXPLICIT' || value === 'CORE') return 'CORE';
  if (value === 'DERIVED') return 'DERIVED';
  return 'UNRESOLVED';
}

function idOf(value: RecordValue): string | undefined {
  return text(value.id)
    ?? text(value.evidenceId)
    ?? text(value.caseId)
    ?? text(value.reviewId)
    ?? text(value.auditId)
    ?? text(value.entityId);
}

export type ProvenanceExplorerInput = {
  root: RecordValue;
  references?: RecordValue[];
  events?: RecordValue[];
  evidence?: RecordValue[];
  relations?: RecordValue[];
  cases?: RecordValue[];
  reviews?: RecordValue[];
  witness?: RecordValue | null;
  audit?: RecordValue[];
};

export function buildProvenanceTrace(input: ProvenanceExplorerInput): ProvenanceTrace {
  const rootId = idOf(input.root) ?? 'ROOT';
  const nodes = new Map<string, ProvenanceTraceNode>();
  const edges = new Map<string, ProvenanceTraceEdge>();

  function addNode(node: ProvenanceTraceNode): void {
    nodes.set(node.id, node);
  }

  function connect(fromId: string, toId: string, relation: string): void {
    if (!nodes.has(fromId) || !nodes.has(toId)) return;
    const id = `TRACE-${relation}-${fromId}-${toId}`;
    edges.set(id, { id, fromId, toId, relation });
  }

  addNode({
    id: rootId,
    kind: 'EVENT',
    label: text(input.root.title) ?? text(input.root.name) ?? rootId,
    lane: lane(input.root.epistemicLane ?? input.root.lane ?? input.root.grounding),
    sourceClass: text(input.root.sourceClass ?? input.root.evidenceClass),
    provenance: text(input.root.provenance),
  });

  for (const reference of input.references ?? []) {
    const id = idOf(reference);
    if (!id) continue;
    addNode({
      id,
      kind: 'REFERENCE',
      label: text(reference.reference) ?? id,
      lane: reference.epistemicLane !== undefined || reference.lane !== undefined
        ? lane(reference.epistemicLane ?? reference.lane)
        : laneFromGrounding(reference.grounding),
      sourceClass: text(reference.sourceClass ?? reference.sourceId),
      provenance: text(reference.provenance),
    });
    const subjectId = text(reference.subjectId);
    if (subjectId === rootId || text(reference.eventId) === rootId) connect(rootId, id, 'REFERENCES');
  }

  for (const event of input.events ?? []) {
    const id = idOf(event);
    if (!id || id === rootId) continue;
    addNode({
      id,
      kind: 'EVENT',
      label: text(event.title) ?? id,
      lane: event.epistemicLane !== undefined || event.lane !== undefined
        ? lane(event.epistemicLane ?? event.lane)
        : laneFromGrounding(event.grounding),
      sourceClass: text(event.sourceClass ?? event.evidenceClass),
      provenance: text(event.provenance),
    });
    if (text(event.prophetId) === rootId || text(event.parentEventId) === rootId) connect(rootId, id, 'RELATED_EVENT');
  }

  for (const evidence of input.evidence ?? []) {
    const id = text(evidence.evidenceId) ?? idOf(evidence);
    if (!id) continue;
    addNode({
      id,
      kind: 'EVIDENCE',
      label: text(evidence.reference) ?? text(evidence.evidenceClass) ?? id,
      lane: evidence.epistemicLane !== undefined || evidence.lane !== undefined
        ? lane(evidence.epistemicLane ?? evidence.lane)
        : laneFromGrounding(evidence.grounding),
      sourceClass: text(evidence.sourceClass ?? evidence.class),
      provenance: text(evidence.provenance),
    });
    const entityId = text(evidence.entityId);
    const reference = text(evidence.reference);
    if (entityId === rootId || reference === text(input.root.reference)) connect(id, rootId, 'SUPPORTS');
  }

  for (const relation of input.relations ?? []) {
    const relationId = idOf(relation) ?? text(relation.id);
    const fromId = text(relation.fromId) ?? text(relation.evidenceId);
    const toId = text(relation.toId) ?? text(relation.targetId);
    if (!relationId || !fromId || !toId) continue;
    addNode({
      id: `RELATION::${relationId}`,
      kind: 'RELATION',
      label: text(relation.relation ?? relation.type) ?? relationId,
      lane: lane(relation.epistemicLane ?? relation.lane ?? relation.grounding),
      sourceClass: text(relation.sourceClass),
      provenance: text(relation.provenance),
    });
    connect(fromId, `RELATION::${relationId}`, 'HAS_RELATION');
    connect(`RELATION::${relationId}`, toId, text(relation.relation ?? relation.type) ?? 'RELATES_TO');
  }

  for (const record of input.cases ?? []) {
    const id = idOf(record);
    if (!id) continue;
    addNode({ id, kind: 'CASE', label: text(record.title) ?? id, lane: lane(record.epistemicLane ?? record.lane ?? record.grounding), provenance: text(record.provenance) });
    if (text(record.targetId) === rootId || text(record.entityId) === rootId) connect(rootId, id, 'CASE');
  }

  for (const record of input.reviews ?? []) {
    const id = idOf(record);
    if (!id) continue;
    addNode({ id, kind: 'REVIEW', label: text(record.status) ?? id, lane: 'UNRESOLVED', provenance: text(record.provenance) });
    const targetId = text(record.targetId) ?? text(record.entityId);
    if (targetId && nodes.has(targetId)) connect(targetId, id, 'REVIEWED_BY');
  }

  if (input.witness) {
    const id = idOf(input.witness) ?? 'WITNESS::CURRENT';
    addNode({ id, kind: 'WITNESS', label: text(input.witness.state) ?? 'WITNESS', lane: input.witness.valid === true ? 'CORE' : 'UNRESOLVED', provenance: text(input.witness.provenance) });
    connect(rootId, id, 'WITNESSED_BY');
  }

  for (const record of input.audit ?? []) {
    const id = idOf(record);
    if (!id) continue;
    addNode({ id, kind: 'AUDIT', label: text(record.action ?? record.type) ?? id, lane: 'CORE', provenance: text(record.provenance) });
    const subjectId = text(record.entityId) ?? text(record.subjectId);
    if (subjectId && nodes.has(subjectId)) connect(subjectId, id, 'AUDITED_BY');
  }

  const list = [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
  const edgeList = [...edges.values()].sort((a, b) => a.id.localeCompare(b.id));
  const knowledgeNodes = list.filter((item) => item.kind !== 'REVIEW' && item.kind !== 'WITNESS' && item.kind !== 'AUDIT');
  const knowledgeLanes = new Set(knowledgeNodes.map((item) => item.lane));
  const rootLane = nodes.get(rootId)?.lane;

  let terminalState: ProvenanceTrace['terminalState'];
  if (knowledgeLanes.has('UNRESOLVED')) terminalState = 'UNRESOLVED';
  else if (rootLane === 'CORE' && knowledgeNodes.length > 0) terminalState = 'GROUNDED';
  else if (knowledgeLanes.has('DERIVED') || rootLane === 'DERIVED') terminalState = 'DERIVED';
  else terminalState = knowledgeNodes.length > 1 ? 'INCOMPLETE' : 'UNRESOLVED';

  return {
    protocol: 'CAB_PROVENANCE_TRACE_V1',
    rootId,
    nodes: list,
    edges: edgeList,
    terminalState,
  };
}
