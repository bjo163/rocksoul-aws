import type { IncomingMessage } from 'node:http';
import { httpError, idempotencyKey } from '../compat/router.js';

export function scopedIdempotencyKey(req: IncomingMessage, actorId: string, operation: string): string | null {
  const key = idempotencyKey(req);
  return key ? `${actorId}:${operation}:${key}` : null;
}

export function idempotencyError(error: unknown): { statusCode: number; body: Record<string, unknown> } | null {
  return error instanceof Error && (error as Error & { code?: unknown }).code === 'IDEMPOTENCY_CONFLICT'
    ? httpError(409, 'IDEMPOTENCY_CONFLICT')
    : null;
}
