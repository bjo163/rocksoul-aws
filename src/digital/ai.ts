import { randomUUID } from 'node:crypto';
import { createDigitalEvent, DIGITAL_TYPES, digitalTrustProfile } from './digital-civilization.js';

export interface AIModelInput {
  modelId?: string;
  provider?: string;
  purpose?: string;
  policy?: Record<string, unknown>;
  provenance?: unknown;
}

export interface AIModel {
  modelId: string;
  type: typeof DIGITAL_TYPES.AI_MODEL;
  provider: string;
  purpose: string;
  policy: Record<string, unknown>;
  provenance: unknown;
}

export interface AIOutputInput {
  [key: string]: unknown;
  type?: never;
}

export const createAIModel = (input: AIModelInput = {}): AIModel => ({
  modelId: input.modelId ?? `AI_${randomUUID()}`,
  type: DIGITAL_TYPES.AI_MODEL,
  provider: input.provider ?? 'unknown',
  purpose: input.purpose ?? 'decision-support',
  policy: input.policy ?? {},
  provenance: input.provenance ?? null,
});

export const createAIOutput = (input: AIOutputInput = {}) =>
  createDigitalEvent({ ...input, type: DIGITAL_TYPES.AI_OUTPUT });

export const evaluateAITrust = (input: Record<string, unknown> = {}) => digitalTrustProfile(input);
