// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import {TypeRegistry,EntityStore,RelationStore,EventStore,ResourceStore,StateStore,EvidenceStore,AccountabilityKernel,RuleEngine,UniversalPipeline} from '../kernel/index.js';

export function createRuntime({rules=[]}={}){
  const typeRegistry=new TypeRegistry();
  const entities=new EntityStore();
  const relations=new RelationStore();
  const events=new EventStore();
  const resources=new ResourceStore();
  const states=new StateStore();
  const evidence=new EvidenceStore();
  const accountability=new AccountabilityKernel();
  const ruleEngine=new RuleEngine(rules);
  const pipeline=new UniversalPipeline({entities,relations,events,rules:ruleEngine,resources,states,evidence,accountability,typeRegistry});
  return {typeRegistry,entities,relations,events,resources,states,evidence,accountability,ruleEngine,pipeline};
}

export function loadJson(file){return JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));}
