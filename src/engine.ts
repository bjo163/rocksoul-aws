import crypto from 'node:crypto';
import { validateGenesis } from './engines/genesis.js';
import { evaluateMizan } from './engines/mizan.js';
import { createWorld } from './engines/world.js';
import { makeTimeEvent } from './engines/time.js';
import { getCountry } from './engines/geography.js';
import { getSpaceRegion } from './engines/space.js';
import { asmaEngineSnapshot } from './revelation/asma/asma-engine.js';

export interface Person {
  personId: string;
  ruhId: string;
  alive: boolean;
  state: 'DUNYA' | 'DECEASED';
  createdAt: string;
}

export interface AmalInput {
  person: Pick<Person, 'ruhId'>;
  sourceId: string;
  gatewayId: string;
  processId: string;
  action: string;
  intention?: string;
  countryId?: string | null;
  spaceRegion?: string;
  factors?: Record<string, unknown>;
}

export interface Amal {
  amalId: string;
  ruhId: string;
  genesis: unknown;
  action: string;
  intention: string;
  world: { country: unknown; space: unknown };
  time: unknown;
  factors: Record<string, unknown>;
  evidence: unknown[];
  createdAt: string;
  scale?: Record<string, unknown>;
}

export interface SemanticVector {
  mode: string;
  [key: string]: unknown;
}

export interface SemanticScores {
  R: number;
  G: number;
  B: number;
  L: number;
  [key: string]: unknown;
}

export interface EvaluateAmalOptions {
  semantic?: SemanticScores | null;
  semanticVector?: SemanticVector | null;
  scale?: Record<string, unknown> | null;
}

const semanticPlaceholder = (): SemanticScores => ({ R: 0, G: 0, B: 0, L: 0 });

export function createPerson({
  ruhId = `RUH_${crypto.randomUUID()}`,
  alive = true,
}: { ruhId?: string; alive?: boolean } = {}): Person {
  return {
    personId: `PERSON_${crypto.randomUUID()}`,
    ruhId,
    alive,
    state: alive ? 'DUNYA' : 'DECEASED',
    createdAt: new Date().toISOString(),
  };
}

export function createAmal({
  person, sourceId, gatewayId, processId, action, intention = 'UNKNOWN',
  countryId = null, spaceRegion = 'EARTH', factors = {},
}: AmalInput): Amal {
  const genesis = validateGenesis({ sourceId, gatewayId, processId });
  return {
    amalId: `AMAL_${crypto.randomUUID()}`,
    ruhId: person.ruhId,
    genesis,
    action,
    intention,
    world: { country: getCountry(countryId), space: getSpaceRegion(spaceRegion) },
    time: makeTimeEvent(),
    factors,
    evidence: [],
    createdAt: new Date().toISOString(),
  };
}

export function evaluateAmal(amal: Amal, {
  semantic = null,
  semanticVector = null,
  scale = null,
}: EvaluateAmalOptions = {}) {
  const vec = semantic ?? semanticPlaceholder();
  const sv: SemanticVector = semanticVector ?? { mode: String(amal.factors.mode ?? 'REFLECTION') };
  const mizan = evaluateMizan({
    semantic: vec,
    semanticVector: sv,
    factors: amal.factors,
    scale: scale ?? amal.scale ?? {},
  });
  return {
    amal,
    asma: {
      engine: 'PURE_REVELATION_ASMA_V1',
      summary: asmaEngineSnapshot(process.cwd(), { maxCandidates: 12, maxFields: 4 }),
    },
    semantic: vec,
    semanticVector: sv,
    mizan,
    destination: 'NOT_DETERMINABLE' as const,
    modelBoundary: 'FINAL_JUDGMENT_REMAINS_OUTSIDE_MODEL' as const,
  };
}

export function createWorldRecord(opts: Parameters<typeof createWorld>[0] = {}) {
  return createWorld(opts);
}
