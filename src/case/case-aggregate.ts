export interface CaseAggregateInput {
  id: string;
  observation: Record<string, unknown>;
  analysis?: Record<string, unknown>;
  lifecycle?: Record<string, unknown> | null;
}

export interface CaseAggregate {
  id: string;
  type: 'CASE';
  version: number;
  status: 'OBSERVED' | 'ANALYZED' | 'EVALUATED' | 'COMPLETED';
  observation: Record<string, unknown>;
  analysis?: Record<string, unknown>;
  lifecycle?: Record<string, unknown> | null;
  updatedAt: string;
}

export function createCaseAggregate(input: CaseAggregateInput): CaseAggregate {
  return {
    id: input.id,
    type: 'CASE',
    version: 1,
    status: input.analysis ? 'ANALYZED' : 'OBSERVED',
    observation: input.observation,
    ...(input.analysis ? { analysis: input.analysis } : {}),
    lifecycle: input.lifecycle ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export function advanceCaseAggregate(current: CaseAggregate, patch: Partial<CaseAggregate>): CaseAggregate {
  return {
    ...current,
    ...patch,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  };
}
