export interface FeatureDefinition {
  featureId: string;
  enabled?: boolean;
  requiredRoles?: string[];
  [key: string]: unknown;
}

export interface FeatureContext { roles?: string[] }

export function createFeatureRegistry(initial: FeatureDefinition[] = []) {
  const features = new Map<string, FeatureDefinition>();
  function register(feature: FeatureDefinition): FeatureDefinition {
    if (!feature?.featureId) throw new Error("featureId is required");
    const normalized = { enabled: true, ...feature, requiredRoles: [...(feature.requiredRoles || [])] };
    features.set(feature.featureId, normalized);
    return normalized;
  }
  for (const feature of initial) register(feature);
  function get(featureId: string): FeatureDefinition | null { return features.get(featureId) || null; }
  function isEnabled(featureId: string, context: FeatureContext = {}): boolean {
    const feature = get(featureId);
    if (!feature || !feature.enabled) return false;
    if (!feature.requiredRoles?.length) return true;
    const roles = new Set(context.roles || []);
    return feature.requiredRoles.some(role => roles.has(role));
  }
  function list(): FeatureDefinition[] { return [...features.values()].map(x => ({ ...x, requiredRoles: [...(x.requiredRoles || [])] })); }
  return { register, get, isEnabled, list, size: () => features.size };
}

export default { createFeatureRegistry };
