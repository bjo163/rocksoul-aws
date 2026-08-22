// @ts-nocheck
import { createDigitalEvent, DIGITAL_TYPES, digitalTrustProfile } from './digital-civilization.js';
export const createAIModel=(input={})=>({modelId:input.modelId??`AI_${Date.now()}`,type:DIGITAL_TYPES.AI_MODEL,provider:input.provider??'unknown',purpose:input.purpose??'decision-support',policy:input.policy??{},provenance:input.provenance??null});
export const createAIOutput=(input={})=>createDigitalEvent({...input,type:DIGITAL_TYPES.AI_OUTPUT});
export const evaluateAITrust=(input={})=>digitalTrustProfile(input);
