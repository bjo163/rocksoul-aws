export type EvidenceHistoryInput = {
  evidenceId: string;
  entityId: string;
  version?: number;
  status?: string;
  supersedes?: string;
  supersededBy?: string;
  supersessionReason?: string;
  createdAt?: string;
};

export type EvidenceHistoryEntry = {
  id: string;
  evidenceId: string;
  entityId: string;
  version: number;
  status: string;
  supersedes: string | null;
  supersededBy: string | null;
  supersessionReason: string | null;
  createdAt: string | null;
  immutable: true;
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function buildEvidenceHistory(records: EvidenceHistoryInput[]): EvidenceHistoryEntry[] {
  const entries = new Map<string, EvidenceHistoryEntry>();
  for (const record of records) {
    const evidenceId = text(record.evidenceId);
    const entityId = text(record.entityId);
    if (!evidenceId || !entityId) continue;
    const version = Number.isInteger(record.version) && Number(record.version) > 0 ? Number(record.version) : 1;
    const id = `EHIST-${entityId}-${evidenceId}-v${version}`;
    entries.set(id, {
      id,
      evidenceId,
      entityId,
      version,
      status: text(record.status) ?? 'UNKNOWN',
      supersedes: text(record.supersedes),
      supersededBy: text(record.supersededBy),
      supersessionReason: text(record.supersessionReason),
      createdAt: text(record.createdAt),
      immutable: true,
    });
  }
  return [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function validateEvidenceHistory(entries: EvidenceHistoryEntry[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) issues.push(`duplicate history id: ${entry.id}`);
    ids.add(entry.id);
    if (entry.immutable !== true) issues.push(`history entry is mutable: ${entry.id}`);
    if (entry.supersedes === entry.evidenceId) issues.push(`self-supersession: ${entry.id}`);
  }
  return issues;
}
