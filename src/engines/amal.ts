import { id, now } from '../core/ids.js';

export interface AmalInput {
  amalId?: string;
  timestamp?: string;
  action?: string;
  intention?: string;
  context?: Record<string, unknown>;
  evidence?: unknown[];
  positive?: boolean;
  factors?: Record<string, unknown>;
}

export interface AmalRecord {
  amalId: string;
  ruhId: string;
  timestamp: string;
  action: string;
  intention: string;
  context: Record<string, unknown>;
  evidence: unknown[];
  positive: boolean;
  factors: Record<string, unknown>;
}

export function createAmal(input: AmalInput = {}, ruhId: string): AmalRecord {
  return {
    amalId: input.amalId ?? id('AMAL'),
    ruhId,
    timestamp: input.timestamp ?? now(),
    action: String(input.action ?? 'UNSPECIFIED').toUpperCase(),
    intention: String(input.intention ?? 'UNKNOWN'),
    context: input.context ?? {},
    evidence: input.evidence ?? [],
    positive: Boolean(input.positive),
    factors: input.factors ?? {},
  };
}
