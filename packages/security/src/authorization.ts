export interface AuthorizationUser {
  userId: string;
  username: string;
  roles: string[];
  rid: string | null;
  active: boolean;
}

export type ActionPermission = 'OBSERVE' | 'ANALYZE' | 'EVALUATE' | 'COMMAND' | 'ADMIN' | 'READ_AUDIT';

const ROLE_PERMISSIONS: Record<string, readonly ActionPermission[]> = {
  USER: ['OBSERVE', 'ANALYZE'],
  REVIEWER: ['OBSERVE', 'ANALYZE', 'EVALUATE', 'READ_AUDIT'],
  OPERATOR: ['OBSERVE', 'ANALYZE', 'COMMAND'],
  ADMIN: ['OBSERVE', 'ANALYZE', 'EVALUATE', 'COMMAND', 'ADMIN', 'READ_AUDIT'],
};

export function hasPermission(user: AuthorizationUser | null, permission: ActionPermission): boolean {
  if (!user || !user.active) return false;
  return user.roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function assertPermission(user: AuthorizationUser | null, permission: ActionPermission): void {
  if (!hasPermission(user, permission)) {
    const error = new Error(`PERMISSION_DENIED:${permission}`);
    Object.assign(error, { code: 'PERMISSION_DENIED', permission, statusCode: 403 });
    throw error;
  }
}

export function permissionsForRoles(roles: readonly string[]): ActionPermission[] {
  return [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []))];
}
