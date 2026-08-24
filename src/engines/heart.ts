export interface HeartState {
  ikhlas?: unknown;
  riya?: unknown;
  kibr?: unknown;
  hasad?: unknown;
  sabr?: unknown;
  shukr?: unknown;
  tawakkul?: unknown;
}

export interface HeartAwareAmal {
  context?: { heart?: HeartState | null } | null;
}

export interface HeartProfile extends HeartState {
  stateKnowledge: 'LIMITED';
}

export function heartProfile(amal: HeartAwareAmal = {}): HeartProfile {
  const h = amal.context?.heart ?? {};
  return {
    ikhlas: h.ikhlas ?? null,
    riya: h.riya ?? null,
    kibr: h.kibr ?? null,
    hasad: h.hasad ?? null,
    sabr: h.sabr ?? null,
    shukr: h.shukr ?? null,
    tawakkul: h.tawakkul ?? null,
    stateKnowledge: 'LIMITED',
  };
}
