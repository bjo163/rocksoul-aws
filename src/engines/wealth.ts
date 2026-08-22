import { runtimeDataset } from '../persistence/runtime-data.js';
const getRegistry = () => runtimeDataset('data/registries/action-semantics.json') as { wealth: Record<string, number> };
export function wealthProfile(amal: any) {
  const registry = getRegistry();
  const action = String(amal?.action ?? '');
  const score = registry.wealth[action] ?? 0;
  return {
    domain: score !== 0 ? 'WEALTH' : 'NONE',
    semanticScore: score,
    ownershipEffect: amal?.context?.ownershipEffect ?? 'UNSPECIFIED',
    distributionEffect: amal?.context?.distributionEffect ?? 'UNSPECIFIED'
  };
}
