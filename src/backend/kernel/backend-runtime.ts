// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { GraphStore } from './graph-store.js';
import { EventBus } from './event-bus.js';
import { UniversalRuleResolver } from './rule-resolver.js';
import { AuditLedger } from './audit-ledger.js';
import { createProvenance } from './provenance.js';
import { TypeRegistry, DepartmentRegistry } from '../../kernel/index.js';

export class BackendRuntime {
  constructor({dataDir = path.resolve('.data'), rules = []} = {}) {
    this.dataDir = dataDir;
    fs.mkdirSync(dataDir, {recursive:true});
    this.stateFile = path.join(dataDir, 'backend-state.json');
    this.ledgerFile = path.join(dataDir, 'audit-ledger.json');
    const snapshot = fs.existsSync(this.stateFile) ? JSON.parse(fs.readFileSync(this.stateFile,'utf8')) : null;
    const ledgerSnapshot = fs.existsSync(this.ledgerFile) ? JSON.parse(fs.readFileSync(this.ledgerFile,'utf8')) : {entries:[]};
    this.graph = new GraphStore({snapshot});
    this.bus = new EventBus();
    this.rules = new UniversalRuleResolver({rules});
    this.ledger = new AuditLedger(ledgerSnapshot);
    this.types = new TypeRegistry({storePath:path.join(dataDir,'types.json')});
    this.departments = new DepartmentRegistry(this.types);
  }
  persist() {
    fs.writeFileSync(this.stateFile, JSON.stringify(this.graph.snapshot(), null, 2));
    fs.writeFileSync(this.ledgerFile, JSON.stringify(this.ledger.snapshot(), null, 2));
  }
  registerType(input) { const result=this.departments.define(input); this.persist(); return result; }
  async createEntity(input) {
    const entity=this.graph.createEntity(input);
    this.ledger.append({type:'ENTITY_CREATED',actor:null,entityId:entity.entityId,payload:{type:entity.type},provenance:createProvenance({sourceType:'BACKEND'})});
    this.persist();
    await this.bus.publish({type:'ENTITY_CREATED',entity});
    return entity;
  }
  async updateEntity(entityId, updates) {
    const entity=this.graph.updateEntity(entityId, updates);
    this.ledger.append({type:'ENTITY_UPDATED',actor:null,entityId:entity.entityId,payload:{type:entity.type},provenance:createProvenance({sourceType:'BACKEND'})});
    this.persist();
    await this.bus.publish({type:'ENTITY_UPDATED',entity});
    return entity;
  }
  async deleteEntity(entityId) {
    this.graph.deleteEntity(entityId);
    this.ledger.append({type:'ENTITY_DELETED',actor:null,entityId,payload:{},provenance:createProvenance({sourceType:'BACKEND'})});
    this.persist();
    await this.bus.publish({type:'ENTITY_DELETED',entityId});
    return { ok: true };
  }
  async createRelation(input) {
    const relation=this.graph.relate(input);
    this.ledger.append({type:'RELATION_CREATED',entityId:relation.from,payload:relation,provenance:createProvenance({sourceType:'BACKEND'})});
    this.persist();
    await this.bus.publish({type:'RELATION_CREATED',relation});
    return relation;
  }
  async appendEvent(input) {
    const event=this.graph.appendEvent(input);
    this.ledger.append({type:'EVENT_RECORDED',actor:event.actor,entityId:event.subject,eventId:event.eventId,payload:{eventType:event.type},provenance:createProvenance({sourceType:'EVENT'})});
    this.persist();
    await this.bus.publish(event);
    return event;
  }
  resolveRule(ctx) { return this.rules.resolve(ctx); }
  health() {
    return {ok:true, kernel:this.graph.integrity().ok, ledger:this.ledger.verify().ok, counts:this.graph.integrity().counts, types:this.types.list().length, timestamp:new Date().toISOString()};
  }
  snapshot() { return {graph:this.graph.snapshot(), ledger:this.ledger.snapshot(), types:this.types.list()}; }
}
