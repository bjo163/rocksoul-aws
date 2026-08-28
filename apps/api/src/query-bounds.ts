export const MAX_LIST_LIMIT = 250;
export const MAX_LIST_OFFSET = 1_000_000;
export const MAX_FILTER_LENGTH = 512;

export type QueryBoundsFailure = 'INVALID_PAGINATION' | 'INVALID_FILTER' | 'UNSUPPORTED_SORT';

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
