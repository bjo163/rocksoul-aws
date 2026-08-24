export interface DuaContext {
  duaRequest?: unknown;
}

export interface DuaInput {
  action?: string | null;
  context?: DuaContext | null;
}

export interface DuaProfile {
  isDua: boolean;
  request: unknown;
  responseBoundary: 'DIVINE_ONLY';
}

export function duaProfile(amal: DuaInput = {}): DuaProfile {
  return {
    isDua: String(amal.action ?? '').toUpperCase() === 'DUA',
    request: amal.context?.duaRequest ?? null,
    responseBoundary: 'DIVINE_ONLY',
  };
}
