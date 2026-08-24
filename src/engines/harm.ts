export interface HarmFactors {
  physicalImpact?: number | null;
  financialImpact?: number | null;
  socialImpact?: number | null;
  systemicImpact?: number | null;
  environmentalImpact?: number | null;
  reversible?: boolean;
}

export interface HarmAwareAmal {
  factors?: HarmFactors | null;
}

export interface HarmProfile {
  physical: number;
  financial: number;
  social: number;
  institutional: number;
  environmental: number;
  reversible: boolean;
}

const finiteOrZero = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

export function harmProfile(amal: HarmAwareAmal): HarmProfile {
  const f = amal.factors ?? {};
  return {
    physical: finiteOrZero(f.physicalImpact),
    financial: finiteOrZero(f.financialImpact),
    social: finiteOrZero(f.socialImpact),
    institutional: finiteOrZero(f.systemicImpact),
    environmental: finiteOrZero(f.environmentalImpact),
    reversible: f.reversible !== false,
  };
}
