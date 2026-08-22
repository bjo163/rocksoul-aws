// @ts-nocheck
import { randomUUID } from 'node:crypto';
import { DIGITAL_TYPES } from './digital-civilization.js';
export const DPI_LAYERS=Object.freeze(['IDENTITY','PAYMENTS','DATA_EXCHANGE','SIGNATURE','PUBLIC_SERVICES','REGISTRIES','TRUST']);
export const createDPIService=(input={})=>({serviceId:input.serviceId??`DPI_${randomUUID()}`,type:DIGITAL_TYPES.DPI_SERVICE,name:input.name??'service',layer:input.layer??'PUBLIC_SERVICES',jurisdiction:input.jurisdiction??'IDN',standards:input.standards??[]});
