// @ts-nocheck
export function bodyWitnessProfile(amal={}) { return {relevant:Boolean(amal.context?.bodyWitness), channels:amal.context?.bodyWitness?.channels??[], sourceStatus:"MODEL_ONLY"}; }
