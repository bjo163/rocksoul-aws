import type { IncomingMessage } from 'node:http';
import type { EntityRecord } from '@moonwitness/persistence';
import type { AuthorizationUser } from '@moonwitness/security';
import { bearerToken, httpError } from './compat/router.js';

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function ownerRid(entity: EntityRecord | null): string | null {
  const value = object(entity?.payload).ownerRid;
  return typeof value === 'string' && value.trim() ? value : null;
}

export function hasOversightAuthority(user: AuthorizationUser): boolean {
  return user.roles.includes('ADMIN');
}

async function hasReviewAssignment(ctx: any, user: AuthorizationUser, entityId: string): Promise<boolean> {
  if (!user.roles.includes('REVIEWER')) return false;
  const reviews = await ctx.universeStore.persistence.entities().list('HUMAN_REVIEW');
  return reviews.some((review: EntityRecord) => {
    const payload = object(review.payload);
    return payload.targetId === entityId
      && payload.status !== 'DISPOSED'
      && (payload.assigneeId === null || payload.assigneeId === undefined || payload.assigneeId === user.userId);
  });
}

/**
 * Private records are always RID-bound. A reviewer/admin can access a record
 * only through administration or an active review assignment; an ordinary account can
 * access only the same RID (or a pre-RID legacy record it originally created).
 * A 404 is returned for an inaccessible object so identifiers cannot be used
 * to enumerate another person's workspace.
 */
export async function requireScopedEntity(
  request: IncomingMessage,
  ctx: any,
  entityId: string,
  options: { allowOversight?: boolean } = {},
): Promise<{ ok: true; user: AuthorizationUser; entity: EntityRecord } | { ok: false; error: ReturnType<typeof httpError> }> {
  const user = await ctx.auth.authenticate(bearerToken(request));
  if (!user) return { ok: false, error: httpError(401, 'UNAUTHORIZED') };
  const entity = await ctx.universeStore.persistence.entities().get(entityId);
  if (!entity) return { ok: false, error: httpError(404, 'RESOURCE_NOT_FOUND') };
  const rid = ownerRid(entity);
  const owned = (rid !== null && user.rid === rid) || (rid === null && entity.createdBy === user.userId);
  const oversight = options.allowOversight !== false && (hasOversightAuthority(user) || await hasReviewAssignment(ctx, user, entityId));
  if (!owned && !oversight) {
    return { ok: false, error: httpError(404, 'RESOURCE_NOT_FOUND') };
  }
  return { ok: true, user, entity };
}

/** Guard legacy write routes without removing their anonymous, non-persistent compatibility use. */
export async function denyForeignRidWrite(request: IncomingMessage, ctx: any, entityId: string): Promise<ReturnType<typeof httpError> | null> {
  const entity = await ctx.universeStore.persistence.entities().get(entityId);
  if (!entity) return null;
  const rid = ownerRid(entity);
  if (!rid) return null;
  const user = await ctx.auth.authenticate(bearerToken(request));
  if (!user || (user.rid !== rid && !hasOversightAuthority(user) && !await hasReviewAssignment(ctx, user, entityId))) return httpError(404, 'RESOURCE_NOT_FOUND');
  return null;
}
