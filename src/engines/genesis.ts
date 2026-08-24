import { runtimeDataset } from '../persistence/runtime-data.js';

export interface GenesisDefinition { id: string; name: string; }
export interface GenesisValidationInput { sourceId: string; gatewayId: string; processId: string; }
export interface GenesisValidationResult extends GenesisValidationInput { valid: true; }

const getSources = (): GenesisDefinition[] => runtimeDataset('data/4-sources.json') as GenesisDefinition[];
const getGateways = (): GenesisDefinition[] => runtimeDataset('data/7-gateways.json') as GenesisDefinition[];
const getProcesses = (): GenesisDefinition[] => runtimeDataset('data/4-processes.json') as GenesisDefinition[];

export function validateGenesis({ sourceId, gatewayId, processId }: GenesisValidationInput): GenesisValidationResult {
  if (!getSources().some((source) => source.id === sourceId)) throw new Error('Invalid source');
  if (!getGateways().some((gateway) => gateway.id === gatewayId)) throw new Error('Invalid gateway');
  if (!getProcesses().some((process) => process.id === processId)) throw new Error('Invalid process');
  return { sourceId, gatewayId, processId, valid: true };
}
