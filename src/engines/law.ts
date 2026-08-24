export interface LawContext {
  lawfulStatus?: string;
  lawSource?: string;
  jurisdiction?: string;
  evidenceStandard?: string;
}

export interface LawAwareAmal {
  context?: LawContext | null;
}

export interface LawProfile {
  lawfulStatus: string;
  source: string;
  jurisdiction: string;
  evidenceStandard: string;
}

export function lawProfile(amal: LawAwareAmal): LawProfile {
  const context = amal.context;
  return {
    lawfulStatus: context?.lawfulStatus ?? 'UNASSESSED',
    source: context?.lawSource ?? 'UNSPECIFIED',
    jurisdiction: context?.jurisdiction ?? 'UNSPECIFIED',
    evidenceStandard: context?.evidenceStandard ?? 'UNSPECIFIED',
  };
}
