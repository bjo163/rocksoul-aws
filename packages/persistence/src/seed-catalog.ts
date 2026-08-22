import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

export interface SeedCatalogRecord {
  sourceId: string;
  path: string;
  entityType: string;
  format: 'json' | 'jsonl';
  sha256: string;
  byteSize: number;
  expectedItems: number;
  seededItems: number;
  status: 'VERIFIED' | 'MISMATCH' | 'ERROR';
  verifiedAt?: string;
}

export function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export async function describeSeedFile(rootDir: string, source: { id: string; path: string; entityType: string; format?: 'json' | 'jsonl'; }): Promise<SeedCatalogRecord> {
  const fullPath = resolve(rootDir, source.path);
  const raw = await readFile(fullPath);
  const text = raw.toString('utf8');
  let expectedItems = 1;
  if (source.format === 'jsonl') {
    expectedItems = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
  } else {
    const parsed = JSON.parse(text) as unknown;
    expectedItems = Array.isArray(parsed) ? parsed.length : 1;
  }
  return {
    sourceId: source.id,
    path: relative(rootDir, fullPath).replaceAll('\\', '/'),
    entityType: source.entityType,
    format: source.format ?? 'json',
    sha256: sha256Text(text),
    byteSize: raw.byteLength,
    expectedItems,
    seededItems: 0,
    status: 'MISMATCH',
  };
}
