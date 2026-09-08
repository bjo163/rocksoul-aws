import crypto from 'node:crypto';
import { canonicalizeAwsContent } from './content-canonicalization.js';

export interface AwsRevisionDelta {
  path: string;
  value: unknown;
}

export interface AwsRevisionChange {
  path: string;
  before: unknown;
  after: unknown;
}

export interface AwsRevisionDiff extends Record<string, unknown> {
  id: string;
  source_ref: string;
  from_revision_ref: string | null;
  to_revision_ref: string;
  added: AwsRevisionDelta[];
  removed: AwsRevisionDelta[];
  changed: AwsRevisionChange[];
  material: boolean;
}

function hash24(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24).toUpperCase();
}

function flatten(value: unknown, prefix = '$', out = new Map<string, unknown>()): Map<string, unknown> {
  if (Array.isArray(value)) {
    if (value.length === 0) out.set(prefix, []);
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, out));
    return out;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) out.set(prefix, {});
    for (const [key, item] of entries) flatten(item, `${prefix}.${key}`, out);
    return out;
  }
  out.set(prefix, value);
  return out;
}

export function createAwsRevisionDiffId(
  sourceRef: string,
  fromRevisionRef: string | null,
  toRevisionRef: string,
): string {
  return `RDIFF-AWS-${hash24(`${sourceRef}|${fromRevisionRef ?? 'NONE'}|${toRevisionRef}`)}`;
}

export function diffAwsSourceRevisions(input: {
  sourceRef: string;
  fromRevisionRef: string | null;
  toRevisionRef: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
}): AwsRevisionDiff {
  const before = flatten(input.before ? canonicalizeAwsContent(input.before) : null);
  const after = flatten(canonicalizeAwsContent(input.after));
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();

  const added: AwsRevisionDelta[] = [];
  const removed: AwsRevisionDelta[] = [];
  const changed: AwsRevisionChange[] = [];

  for (const path of paths) {
    const hadBefore = before.has(path);
    const hasAfter = after.has(path);
    if (!hadBefore && hasAfter) {
      added.push({ path, value: structuredClone(after.get(path)) });
      continue;
    }
    if (hadBefore && !hasAfter) {
      removed.push({ path, value: structuredClone(before.get(path)) });
      continue;
    }
    const left = before.get(path);
    const right = after.get(path);
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      changed.push({ path, before: structuredClone(left), after: structuredClone(right) });
    }
  }

  return {
    id: createAwsRevisionDiffId(input.sourceRef, input.fromRevisionRef, input.toRevisionRef),
    source_ref: input.sourceRef,
    from_revision_ref: input.fromRevisionRef,
    to_revision_ref: input.toRevisionRef,
    added,
    removed,
    changed,
    material: added.length + removed.length + changed.length > 0,
  };
}
