import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface RevelationContextRecord {
  ayah_refs: string[];
  context?: string;
  source_ref: string;
  report_status: string;
  confidence: string;
}

const MANIFEST = resolve(resolve(dirname(fileURLToPath(import.meta.url)), '../../'), 'data/revelation/asbab-import-manifest.json');

export async function loadRevelationContextManifest() {
  return JSON.parse(await readFile(MANIFEST, 'utf8')) as {
    version: number;
    dataset_name: string;
    expected_shape: Record<string, number>;
    sources: Array<{ id: string; url: string; status: string; reason?: string }>;
    record_schema: Record<string, unknown>;
  };
}

export function validateRevelationContextRecord(record: RevelationContextRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(record.ayah_refs) || record.ayah_refs.length === 0) errors.push('ayah_refs_required');
  if (!record.source_ref) errors.push('source_ref_required');
  if (!record.report_status) errors.push('report_status_required');
  if (!record.confidence) errors.push('confidence_required');
  return { valid: errors.length === 0, errors };
}
