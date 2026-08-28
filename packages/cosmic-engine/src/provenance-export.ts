import { createHash } from 'node:crypto';

export type AuditExportInput = {
  subject: { id: string; type: string };
  records?: unknown[];
  provenance?: unknown;
  release?: { version: string; revision?: string };
};
export type ProvenanceAuditPackage = Readonly<{
  protocol: 'COSMIC_PROVENANCE_AUDIT_PACKAGE_V1';
  subject: { id: string; type: string };
  release: { version: string; revision: string | null } | null;
  records: unknown[];
  provenance: unknown;
  integrity: { algorithm: 'SHA-256'; canonicalization: 'JCS-LIKE_SORTED_JSON_V1'; payloadSha256: string; packageId: string };
}>;

const forbidden = new Set(['privatekey', 'private_key', 'secret', 'password', 'token', 'authorization']);
function canonicalize(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (!value || typeof value !== 'object') throw new Error('AUDIT_EXPORT_NON_JSON_VALUE');
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
}
function assertSafe(value: unknown): void {
  if (Array.isArray(value)) { value.forEach(assertSafe); return; }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (forbidden.has(key.toLowerCase())) throw new Error('AUDIT_EXPORT_SECRET_FIELD_FORBIDDEN');
    assertSafe(child);
  }
}
function digest(value: unknown): string { return createHash('sha256').update(canonicalize(value)).digest('hex'); }

/** Creates a transport-neutral, deterministic audit artifact. No timestamps or secrets are added. */
export function createProvenanceAuditPackage(input: AuditExportInput): ProvenanceAuditPackage {
  if (!input?.subject?.id || !input.subject.type) throw new Error('AUDIT_EXPORT_SUBJECT_REQUIRED');
  const payload = { protocol: 'COSMIC_PROVENANCE_AUDIT_PACKAGE_V1' as const, subject: { id: input.subject.id, type: input.subject.type }, release: input.release ? { version: input.release.version, revision: input.release.revision ?? null } : null, records: input.records ?? [], provenance: input.provenance ?? null };
  assertSafe(payload);
  const payloadSha256 = digest(payload);
  return Object.freeze({ ...payload, integrity: Object.freeze({ algorithm: 'SHA-256' as const, canonicalization: 'JCS-LIKE_SORTED_JSON_V1' as const, payloadSha256, packageId: `AUDIT-${payloadSha256.slice(0, 24)}` }) });
}

export function serializeProvenanceAuditPackage(value: ProvenanceAuditPackage): string { return canonicalize(value); }
export function verifyProvenanceAuditPackage(value: ProvenanceAuditPackage): boolean {
  try { const { integrity, ...payload } = value; return integrity.algorithm === 'SHA-256' && integrity.payloadSha256 === digest(payload) && integrity.packageId === `AUDIT-${integrity.payloadSha256.slice(0, 24)}`; } catch { return false; }
}
