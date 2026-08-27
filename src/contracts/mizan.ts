export type MizanVector = number[];
export type MizanScale = Record<string, unknown>;
export type MizanFactors = Record<string, number>;
export type MizanDomainVector = Record<string, number>;

export interface MizanInput {
  semantic?: Record<string, number>;
  semanticVector?: Record<string, unknown>;
  factors?: MizanFactors;
  scale?: MizanScale;
  actionGateVector?: MizanVector;
  impactVector?: MizanVector;
  timeFactor?: Record<string, unknown>;
  causality?: Record<string, unknown>;
  domainVector?: MizanDomainVector;
  semanticObservation?: Record<string, unknown>;
  evidenceCount?: number;
  confidence?: number;
  evidenceQuality?: number;
}

export interface MizanResult {
  raw?: number;
  band?: number;
  score?: number;
  semantic?: Record<string, number>;
  perspectives?: Record<string, unknown>;
  semanticVector?: Record<string, unknown>;
  actionGateVector?: MizanVector;
  impactVector?: MizanVector;
  timeFactor?: Record<string, unknown>;
  causality?: Record<string, unknown>;
  domainVector?: MizanDomainVector;
  scale?: MizanScale;
  scaleFactor?: number;
  semanticScaleAffinity?: number;
  assessment?: Record<string, unknown>;
  xp?: Record<string, unknown>;
  trace?: unknown;
  modelOnly?: boolean;
  [key: string]: unknown;
}

export function isMizanInput(value: unknown): value is MizanInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  for (const key of ['semantic', 'semanticVector', 'factors', 'scale', 'timeFactor', 'causality', 'domainVector', 'semanticObservation']) {
    if (input[key] !== undefined && (typeof input[key] !== 'object' || input[key] === null || Array.isArray(input[key]))) return false;
  }
  for (const key of ['actionGateVector', 'impactVector']) {
    if (input[key] !== undefined && (!Array.isArray(input[key]) || input[key].some((item) => typeof item !== 'number' || !Number.isFinite(item)))) return false;
  }
  for (const key of ['evidenceCount', 'confidence', 'evidenceQuality']) {
    if (input[key] !== undefined && (typeof input[key] !== 'number' || !Number.isFinite(input[key]))) return false;
  }
  return true;
}
