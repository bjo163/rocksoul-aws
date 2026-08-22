import { runtimeDataset } from '../persistence/runtime-data.js';
const getRegistry = () => runtimeDataset('data/registries/action-semantics.json') as { rights: Record<string, string[]> };
export function rightsProfile(amal: any) {
  const registry = getRegistry();
  const action = String(amal?.action ?? '');
  return {
    violated: registry.rights[action] ?? [],
    claimantIds: amal?.context?.claimantIds ?? [],
    repaired: Boolean(amal?.factors?.repair),
    restitution: Boolean(amal?.factors?.restitution)
  };
}
