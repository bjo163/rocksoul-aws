// @ts-nocheck
export const DATA_CLASSES = Object.freeze(['PUBLIC','INTERNAL','PERSONAL','SENSITIVE','RESTRICTED','SECRET']);
export const ROLES = Object.freeze(['USER','RESEARCHER','ADMIN','AUDITOR']);

export function authorize({user, requiredRoles=[], requiredPermission=null, resourceClass='PUBLIC', action='read'}={}) {
  if (!user?.active) return {allowed:false, reason:'INACTIVE_USER'};
  if (requiredRoles.length && !requiredRoles.some(r=>user.roles?.includes(r))) return {allowed:false, reason:'ROLE_DENIED'};
  if (requiredPermission && !(user.permissions ?? []).includes(requiredPermission)) return {allowed:false, reason:'PERMISSION_DENIED'};
  if (resourceClass === 'SECRET' && !user.roles?.includes('ADMIN')) return {allowed:false, reason:'CLASSIFICATION_DENIED'};
  return {allowed:true, action, resourceClass};
}

export function classifyData({containsPersonal=false, sensitive=false, restricted=false, secret=false}={}) {
  if (secret) return 'SECRET';
  if (restricted) return 'RESTRICTED';
  if (sensitive) return 'SENSITIVE';
  if (containsPersonal) return 'PERSONAL';
  return 'PUBLIC';
}

export function privacyPolicy({resourceClass='PUBLIC', purpose='GENERAL', consent=false}={}) {
  const needsConsent = ['PERSONAL','SENSITIVE'].includes(resourceClass);
  return {resourceClass, purpose, consentRequired:needsConsent, consentSatisfied:needsConsent ? Boolean(consent) : true, publishable:resourceClass==='PUBLIC'};
}
