import { randomUUID } from 'node:crypto';
import { DIGITAL_TYPES } from './digital-civilization.js';

export const DPI_LAYERS = Object.freeze([
  'IDENTITY', 'PAYMENTS', 'DATA_EXCHANGE', 'SIGNATURE', 'PUBLIC_SERVICES', 'REGISTRIES', 'TRUST',
] as const);

export type DpiLayer = (typeof DPI_LAYERS)[number];

export interface DPIServiceInput {
  serviceId?: string;
  name?: string;
  layer?: DpiLayer;
  jurisdiction?: string;
  standards?: string[];
}

export interface DPIService {
  serviceId: string;
  type: typeof DIGITAL_TYPES.DPI_SERVICE;
  name: string;
  layer: DpiLayer;
  jurisdiction: string;
  standards: string[];
}

export const createDPIService = (input: DPIServiceInput = {}): DPIService => ({
  serviceId: input.serviceId ?? `DPI_${randomUUID()}`,
  type: DIGITAL_TYPES.DPI_SERVICE,
  name: input.name ?? 'service',
  layer: input.layer ?? 'PUBLIC_SERVICES',
  jurisdiction: input.jurisdiction ?? 'IDN',
  standards: input.standards ?? [],
});
