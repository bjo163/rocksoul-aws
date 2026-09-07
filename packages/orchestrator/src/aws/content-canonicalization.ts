import { isDeepStrictEqual } from 'node:util';

export const AWS_VOLATILE_PROVENANCE_KEYS = new Set([
  'retrieved_at',
  'captured_at',
  'fetched_at',
  'polled_at',
]);

export function canonicalizeAwsContent(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeAwsContent);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !AWS_VOLATILE_PROVENANCE_KEYS.has(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalizeAwsContent(item)]),
    );
  }
  return value;
}

export function isAwsContentEqual(left: unknown, right: unknown): boolean {
  return isDeepStrictEqual(
    canonicalizeAwsContent(left),
    canonicalizeAwsContent(right),
  );
}
