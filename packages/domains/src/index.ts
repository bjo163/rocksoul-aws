import type {
  DefenseProfile, DefenseProfileInput,
  DigitalTrustProfile, DigitalTrustProfileInput,
  EconomyProfile, EconomyProfileInput,
  EnergyProfile, EnergyProfileInput,
  EnvironmentalProfile, EnvironmentalProfileInput,
  FoodSystemProfile, FoodSystemProfileInput,
  ForeignAffairsProfile, ForeignAffairsProfileInput,
  InfrastructureProfile, InfrastructureProfileInput,
  ResilienceProfile, ResilienceProfileInput,
  ScienceTechProfile, ScienceTechProfileInput,
  SocialProtectionProfile, SocialProtectionProfileInput,
  WaterProfile, WaterProfileInput,
} from './types.js';

export * from './types.js';

export function defenseProfile(input: DefenseProfileInput = {}): DefenseProfile {
  const capabilities = input.capabilities ?? [];
  const procurements = input.procurements ?? [];
  const oversight = input.oversight ?? [];
  return {
    capabilities,
    procurements,
    oversight,
    oversightCoverage: capabilities.length ? oversight.length / capabilities.length : 0,
  };
}

export function digitalTrustProfile(input: DigitalTrustProfileInput = {}): DigitalTrustProfile {
  const identities = Number(input.identities ?? 0);
  const verified = Number(input.verified ?? 0);
  const incidents = Number(input.incidents ?? 0);
  const openIssues = Number(input.openIssues ?? 0);
  return {
    identities,
    verified,
    verificationRate: identities > 0 ? verified / identities : 0,
    incidents,
    openIssues,
  };
}

export function economyProfile(input: EconomyProfileInput = {}): EconomyProfile {
  const employment = input.employment ?? [];
  const businesses = input.businesses ?? [];
  const transactions = input.transactions ?? [];
  return {
    employment,
    businesses,
    transactionCount: transactions.length,
    grossTransactionVolume: transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0),
  };
}

export function energyProfile(input: EnergyProfileInput = {}): EnergyProfile {
  const generation = Number(input.generation ?? 0);
  const demand = Number(input.demand ?? 0);
  const storage = Number(input.storage ?? 0);
  const renewable = Number(input.renewable ?? 0);
  return {
    generation,
    demand,
    storage,
    renewable,
    net: generation + storage - demand,
    renewableShare: generation > 0 ? renewable / generation : 0,
  };
}

export function environmentalProfile(input: EnvironmentalProfileInput = {}): EnvironmentalProfile {
  const air = input.air ?? 'UNKNOWN';
  const water = input.water ?? 'UNKNOWN';
  const forest = Number(input.forest ?? 0);
  const pollution = Number(input.pollution ?? 0);
  const restoration = Number(input.restoration ?? 0);
  return {
    air,
    water,
    forest,
    pollution,
    restoration,
    restorationGap: Math.max(0, pollution - restoration),
  };
}

export function foodSystemProfile(input: FoodSystemProfileInput = {}): FoodSystemProfile {
  const production = Number(input.production ?? 0);
  const reserve = Number(input.reserve ?? 0);
  const consumption = Number(input.consumption ?? 0);
  const waste = Number(input.waste ?? 0);
  const regions = input.regions ?? [];
  return {
    production,
    reserve,
    consumption,
    waste,
    netAvailability: production + reserve - consumption - waste,
    regions,
  };
}

export function foreignAffairsProfile(input: ForeignAffairsProfileInput = {}): ForeignAffairsProfile {
  const treaties = input.treaties ?? [];
  const missions = input.missions ?? [];
  const tradeAgreements = input.tradeAgreements ?? [];
  return {
    treaties,
    missions,
    tradeAgreements,
    activeTreaties: treaties.filter((x) => x.status === 'ACTIVE').length,
  };
}

export function infrastructureProfile(input: InfrastructureProfileInput = {}): InfrastructureProfile {
  const assets = input.assets ?? [];
  const projects = input.projects ?? [];
  return {
    assets,
    projects,
    totalAssets: assets.length,
    totalProjects: projects.length,
    maintenanceRequired: assets.filter((x) => x.maintenanceDue === true).length,
  };
}

export function resilienceProfile(input: ResilienceProfileInput = {}): ResilienceProfile {
  const hazards = input.hazards ?? [];
  const plans = input.plans ?? [];
  const exercises = input.exercises ?? [];
  const criticalServices = input.criticalServices ?? [];
  return {
    hazardCount: hazards.length,
    planCount: plans.length,
    exerciseCount: exercises.length,
    criticalServices,
    preparednessScore: (plans.length + exercises.length) / (Math.max(1, hazards.length) * 2),
  };
}

export function scienceTechProfile(input: ScienceTechProfileInput = {}): ScienceTechProfile {
  const research = input.research ?? [];
  const systems = input.systems ?? [];
  const aiSystems = input.aiSystems ?? [];
  const spaceMissions = input.spaceMissions ?? [];
  return {
    researchCount: research.length,
    systemCount: systems.length,
    aiCount: aiSystems.length,
    spaceMissionCount: spaceMissions.length,
  };
}

export function socialProtectionProfile(input: SocialProtectionProfileInput = {}): SocialProtectionProfile {
  const households = input.households ?? [];
  const programs = input.programs ?? [];
  return {
    households,
    programs,
    vulnerableHouseholds: households.filter((x) => x.vulnerable === true).length,
    coverageRate: households.length ? programs.length / households.length : 0,
  };
}

export function waterProfile(input: WaterProfileInput = {}): WaterProfile {
  const supply = Number(input.supply ?? 0);
  const demand = Number(input.demand ?? 0);
  const reserve = Number(input.reserve ?? 0);
  const quality = input.quality ?? 'UNKNOWN';
  return {
    supply,
    demand,
    reserve,
    quality,
    balance: supply + reserve - demand,
  };
}
