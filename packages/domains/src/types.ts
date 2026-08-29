export interface DefenseProfileInput {
  capabilities?: readonly unknown[];
  procurements?: readonly unknown[];
  oversight?: readonly unknown[];
}

export interface DefenseProfile {
  capabilities: readonly unknown[];
  procurements: readonly unknown[];
  oversight: readonly unknown[];
  oversightCoverage: number;
}

export interface DigitalTrustProfileInput {
  identities?: number;
  verified?: number;
  incidents?: number;
  openIssues?: number;
}

export interface DigitalTrustProfile {
  identities: number;
  verified: number;
  verificationRate: number;
  incidents: number;
  openIssues: number;
}

export interface EconomyTransaction {
  amount?: number;
  [key: string]: unknown;
}

export interface EconomyProfileInput {
  employment?: readonly unknown[];
  businesses?: readonly unknown[];
  transactions?: readonly EconomyTransaction[];
}

export interface EconomyProfile {
  employment: readonly unknown[];
  businesses: readonly unknown[];
  transactionCount: number;
  grossTransactionVolume: number;
}

export interface EnergyProfileInput {
  generation?: number;
  demand?: number;
  storage?: number;
  renewable?: number;
}

export interface EnergyProfile {
  generation: number;
  demand: number;
  storage: number;
  renewable: number;
  net: number;
  renewableShare: number;
}

export interface EnvironmentalProfileInput {
  air?: string;
  water?: string;
  forest?: number;
  pollution?: number;
  restoration?: number;
}

export interface EnvironmentalProfile {
  air: string;
  water: string;
  forest: number;
  pollution: number;
  restoration: number;
  restorationGap: number;
}

export interface FoodSystemProfileInput {
  production?: number;
  reserve?: number;
  consumption?: number;
  waste?: number;
  regions?: readonly unknown[];
}

export interface FoodSystemProfile {
  production: number;
  reserve: number;
  consumption: number;
  waste: number;
  netAvailability: number;
  regions: readonly unknown[];
}

export interface TreatyRecord {
  status?: string;
  [key: string]: unknown;
}

export interface ForeignAffairsProfileInput {
  treaties?: readonly TreatyRecord[];
  missions?: readonly unknown[];
  tradeAgreements?: readonly unknown[];
}

export interface ForeignAffairsProfile {
  treaties: readonly TreatyRecord[];
  missions: readonly unknown[];
  tradeAgreements: readonly unknown[];
  activeTreaties: number;
}

export interface AssetRecord {
  maintenanceDue?: boolean;
  [key: string]: unknown;
}

export interface InfrastructureProfileInput {
  assets?: readonly AssetRecord[];
  projects?: readonly unknown[];
}

export interface InfrastructureProfile {
  assets: readonly AssetRecord[];
  projects: readonly unknown[];
  totalAssets: number;
  totalProjects: number;
  maintenanceRequired: number;
}

export interface ResilienceProfileInput {
  hazards?: readonly unknown[];
  plans?: readonly unknown[];
  exercises?: readonly unknown[];
  criticalServices?: readonly unknown[];
}

export interface ResilienceProfile {
  hazardCount: number;
  planCount: number;
  exerciseCount: number;
  criticalServices: readonly unknown[];
  preparednessScore: number;
}

export interface ScienceTechProfileInput {
  research?: readonly unknown[];
  systems?: readonly unknown[];
  aiSystems?: readonly unknown[];
  spaceMissions?: readonly unknown[];
}

export interface ScienceTechProfile {
  researchCount: number;
  systemCount: number;
  aiCount: number;
  spaceMissionCount: number;
}

export interface HouseholdRecord {
  vulnerable?: boolean;
  [key: string]: unknown;
}

export interface SocialProtectionProfileInput {
  households?: readonly HouseholdRecord[];
  programs?: readonly unknown[];
}

export interface SocialProtectionProfile {
  households: readonly HouseholdRecord[];
  programs: readonly unknown[];
  vulnerableHouseholds: number;
  coverageRate: number;
}

export interface WaterProfileInput {
  supply?: number;
  demand?: number;
  reserve?: number;
  quality?: string;
}

export interface WaterProfile {
  supply: number;
  demand: number;
  reserve: number;
  quality: string;
  balance: number;
}
