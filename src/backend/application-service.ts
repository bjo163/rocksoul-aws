// @ts-nocheck
import {registerCoreDomainTypes} from './domain-types.js';

export class BackendApplicationService {
  constructor(runtime) { this.runtime=runtime; registerCoreDomainTypes(runtime); }
  createEntity(input){ return this.runtime.createEntity(input); }
  updateEntity(entityId, updates){ return this.runtime.updateEntity(entityId, updates); }
  deleteEntity(entityId){ return this.runtime.deleteEntity(entityId); }
  createRelation(input){ return this.runtime.createRelation(input); }
  recordEvent(input){ return this.runtime.appendEvent(input); }
  resolveRule(input){ return this.runtime.resolveRule(input); }
  graph(entityId){ return this.runtime.graph.graphFor(entityId); }
  health(){ return this.runtime.health(); }
}
