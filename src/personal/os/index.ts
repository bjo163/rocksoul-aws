export { buildCommandCenter } from '../command-center/index.js';
export { orchestrate } from '../orchestrator/index.js';
export { createMemory, scoreMemory } from '../memory/index.js';
export { suggestCabAction } from '../cab-automation/index.js';
export { buildPersonalLifecycle } from '../e2e/index.js';
export function personalOsMetadata(){ return {name:'MoonWitness Personal OS',version:'3.0.0',mode:'PERSONAL',visibility:'PRIVATE'}; }
