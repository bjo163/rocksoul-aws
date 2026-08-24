export interface HisabInput {
  amal: { action: string; intention: string };
  semantic?: unknown;
  rights?: unknown;
  wealth?: unknown;
  harm?: unknown;
  accountability?: unknown;
  tawbah?: unknown;
  lawlessness?: unknown;
}

export interface HisabProfile {
  reviewedFields: readonly string[];
  action: string;
  intention: string;
  semantic: unknown;
  rights: unknown;
  wealth: unknown;
  harm: unknown;
  accountability: unknown;
  tawbah: unknown;
  lawlessness: unknown;
}

export function hisabProfile({
  amal, semantic = null, rights = null, wealth = null, harm = null,
  accountability = null, tawbah = null, lawlessness = null,
}: HisabInput): HisabProfile {
  return {
    reviewedFields: ['ACTION', 'INTENTION', 'CONTEXT', 'ESSENCE', 'RIGHTS', 'WEALTH', 'HARM', 'ACCOUNTABILITY', 'TAWBAH', 'LAWLESSNESS'],
    action: amal.action,
    intention: amal.intention,
    rights,
    wealth,
    harm,
    accountability,
    tawbah,
    lawlessness,
    semantic,
  };
}
