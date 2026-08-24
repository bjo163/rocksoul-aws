export type CanonicalProphetProfile = {
  id: string;
  name: string;
  order: number;
  role?: string;
  sourceProfiles: string[];
  aliases: string[];
  quranReferences: string[];
  missionTags: string[];
  heroReference: boolean;
  provenance: 'DATASET_CANONICAL';
};

type RawProphetRecord = {
  id: string;
  name: string;
  order?: number;
  role?: string;
  sourceProfiles?: unknown;
  metadata?: {
    aliases?: unknown;
    quranReferences?: unknown;
    missionTags?: unknown;
    heroReference?: unknown;
  };
};

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

export function normalizeProphetProfiles(records: RawProphetRecord[]): CanonicalProphetProfile[] {
  return [...records]
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .map((record) => ({
      id: record.id,
      name: record.name,
      order: record.order ?? 0,
      role: record.role,
      sourceProfiles: strings(record.sourceProfiles),
      aliases: strings(record.metadata?.aliases),
      quranReferences: strings(record.metadata?.quranReferences),
      missionTags: strings(record.metadata?.missionTags),
      heroReference: record.metadata?.heroReference === true,
      provenance: 'DATASET_CANONICAL' as const,
    }));
}
