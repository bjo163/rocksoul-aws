// @ts-nocheck
import { IntegrationKernel } from '../core/integration-kernel.js';
import { RuleCatalog } from './rule-catalog.js';
export class Orchestrator {
  constructor({kernel=new IntegrationKernel(), rules=new RuleCatalog()}={}){this.kernel=kernel;this.rules=rules;}
  registerAll(entries={}){for(const [k,v] of Object.entries(entries))this.kernel.register(k,v);return this;}
  evaluate({domain, input}){const svc=this.kernel.resolve(domain);if(!svc?.evaluate)throw new Error(`DOMAIN_NOT_REGISTERED:${domain}`);return svc.evaluate(input);}
  health(){return this.kernel.health();}
}
