export type UniverseProjectionInput = {
  entities: Array<Record<string, unknown>>;
  relations: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  evidence: Array<Record<string, unknown>>;
  cases: Array<Record<string, unknown>>;
  graph?: {
    nodes?: Array<Record<string, unknown>>;
    relations?: Array<Record<string, unknown>>;
    lanes?: Record<string, number>;
  } | null;
};

export type UniverseProjection = {
  protocol: 'CAB_UNIVERSE_READ_V1';
  world: {
    entityCount: number;
    relationCount: number;
    eventCount: number;
    caseCount: number;
  };
  revelation: {
    nodeCount: number;
    relationCount: number;
    lanes: { core: number; derived: number; unresolved: number };
  };
  knowledge: {
    evidenceCount: number;
    verifiedCount: number;
    conflictedCount: number;
    supersededCount: number;
  };
  governance: {
    reviewableCaseCount: number;
    witnessPendingCount: number;
  };
};

function statusOf(value: unknown): string {
  return typeof value === 'string' ? value.toUpperCase() : '';
}

export function buildUniverseProjection(input: UniverseProjectionInput): UniverseProjection {
  const evidence = input.evidence;
  const cases = input.cases;
  const graph = input.graph;

  return {
    protocol: 'CAB_UNIVERSE_READ_V1',
    world: {
      entityCount: input.entities.length,
      relationCount: input.relations.length,
      eventCount: input.events.length,
      caseCount: cases.length,
    },
    revelation: {
      nodeCount: graph?.nodes?.length ?? 0,
      relationCount: graph?.relations?.length ?? 0,
      lanes: {
        core: graph?.lanes?.core ?? 0,
        derived: graph?.lanes?.derived ?? 0,
        unresolved: graph?.lanes?.unresolved ?? 0,
      },
    },
    knowledge: {
      evidenceCount: evidence.length,
      verifiedCount: evidence.filter((item) => ['VERIFIED', 'CORROBORATED'].includes(statusOf(item.status))).length,
      conflictedCount: evidence.filter((item) => statusOf(item.status) === 'CONFLICTED').length,
      supersededCount: evidence.filter((item) => Boolean(item.supersededBy)).length,
    },
    governance: {
      reviewableCaseCount: cases.filter((item) => ['REVIEW_REQUIRED', 'BLOCKED'].includes(statusOf(item.status))).length,
      witnessPendingCount: cases.filter((item) => statusOf(item.witnessState ?? item.witness) === 'PENDING').length,
    },
  };
}
