// @ts-nocheck
import { randomUUID } from 'node:crypto';
import { createDigitalEvent, DIGITAL_TYPES } from './digital-civilization.js';
export const createInternetEvent=(input={})=>createDigitalEvent({...input,type:input.type??DIGITAL_TYPES.INTERNET_DOMAIN});
export const createNetworkAsset=(input={})=>({assetId:input.assetId??`NET_${randomUUID()}`,type:input.type??DIGITAL_TYPES.INTERNET_NETWORK,name:input.name??'network',owner:input.owner??null,metadata:input.metadata??{}});
