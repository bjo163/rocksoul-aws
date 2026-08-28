export const MAX_LIST_LIMIT = 250;
export const MAX_LIST_OFFSET = 1_000_000;
export const MAX_FILTER_LENGTH = 512;

export type QueryBoundsFailure = 'INVALID_PAGINATION' | 'INVALID_FILTER' | 'UNSUPPORTED_SORT' | 'INVALID_CURSOR' | 'CURSOR_OFFSET_CONFLICT';

type QueryBoundsResult<T> = { ok: true; value: T } | { ok: false; code: QueryBoundsFailure };

export function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): QueryBoundsResult<number> {
  if (value === undefined || value === null || value === '') return { ok: true, value: fallback };
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? { ok: true, value: parsed }
    : { ok: false, code: 'INVALID_PAGINATION' };
}

export function boundedFilter(value: unknown, maximum = MAX_FILTER_LENGTH): QueryBoundsResult<string | undefined> {
  if (value === undefined || value === null || value === '') return { ok: true, value: undefined };
  if (typeof value !== 'string') return { ok: false, code: 'INVALID_FILTER' };
  const normalized = value.trim();
  return normalized.length <= maximum && !/[\u0000-\u001f]/.test(normalized)
    ? { ok: true, value: normalized || undefined }
    : { ok: false, code: 'INVALID_FILTER' };
}

export function rejectUnsupportedSort(query: URLSearchParams): QueryBoundsResult<undefined> {
  return query.has('sort') || query.has('order')
    ? { ok: false, code: 'UNSUPPORTED_SORT' }
    : { ok: true, value: undefined };
}

export function listQueryBounds(query: URLSearchParams, limitValue: unknown, defaultLimit: number): QueryBoundsResult<{ limit: number; offset: number }> {
  const limit = boundedInteger(limitValue, defaultLimit, 1, MAX_LIST_LIMIT);
  if (!limit.ok) return limit;
  const offset = boundedInteger(query.get('offset'), 0, 0, MAX_LIST_OFFSET);
  if (!offset.ok) return offset;
  return { ok: true, value: { limit: limit.value, offset: offset.value } };
}

/**
 * Cursor pagination is opt-in for the canonical query workflow. Existing
 * offset callers retain their current response shape and source ordering.
 */
export function cursorQueryBounds(
  query: URLSearchParams,
  cursorValue: unknown,
  limitValue: unknown,
  defaultLimit: number,
): QueryBoundsResult<{ limit: number; cursor?: string }> {
  const limit = boundedInteger(limitValue, defaultLimit, 1, MAX_LIST_LIMIT);
  if (!limit.ok) return limit;
  if (cursorValue === undefined || cursorValue === null || cursorValue === '') return { ok: true, value: { limit: limit.value } };
  if (query.has('offset')) return { ok: false, code: 'CURSOR_OFFSET_CONFLICT' };
  if (typeof cursorValue !== 'string' || cursorValue.length > 512) return { ok: false, code: 'INVALID_CURSOR' };
  try {
    const decoded = Buffer.from(cursorValue, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as { v?: unknown; after?: unknown };
    if (parsed.v !== 1 || typeof parsed.after !== 'string' || !parsed.after || Buffer.from(JSON.stringify(parsed)).toString('base64url') !== cursorValue) {
      return { ok: false, code: 'INVALID_CURSOR' };
    }
    return { ok: true, value: { limit: limit.value, cursor: parsed.after } };
  } catch {
    return { ok: false, code: 'INVALID_CURSOR' };
  }
}

export function encodeCursor(after: string): string {
  return Buffer.from(JSON.stringify({ v: 1, after })).toString('base64url');
}

/** Stable keyset pagination for records with a unique, immutable identifier. */
export function stableCursorPage<T>(
  items: readonly T[],
  limit: number,
  cursor: string | undefined,
  identifier: (item: T) => string,
): { results: T[]; nextCursor?: string } {
  const ordered = [...items].sort((left, right) => {
    const a = identifier(left);
    const b = identifier(right);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const eligible = cursor === undefined ? ordered : ordered.filter((item) => identifier(item) > cursor);
  const results = eligible.slice(0, limit);
  const last = results.at(-1);
  return {
    results,
    ...(last !== undefined && eligible.length > results.length ? { nextCursor: encodeCursor(identifier(last)) } : {}),
  };
}

export function queryFilters(input: Record<string, unknown>, query: URLSearchParams): QueryBoundsResult<{ q?: string; type?: string; entityId?: string }> {
  const sort = rejectUnsupportedSort(query);
  if (!sort.ok) return sort;
  const q = boundedFilter(typeof input.query === 'string' ? input.query : query.get('q'));
  const type = boundedFilter(typeof input.type === 'string' ? input.type : query.get('type'), 128);
  const entityId = boundedFilter(typeof input.entityId === 'string' ? input.entityId : query.get('entityId'), 256);
  if (!q.ok) return q;
  if (!type.ok) return type;
  if (!entityId.ok) return entityId;
  return { ok: true, value: { q: q.value, type: type.value, entityId: entityId.value } };
}
