type Loose = Record<string, any>;
import {provenance} from './provenance.js';

export class UniversalPipeline {
  declare entities: Loose; declare relations: Loose; declare events: Loose; declare rules: Loose; declare resources: Loose; declare states: Loose; declare evidence: Loose; declare accountability: Loose; declare typeRegistry: Loose;
  constructor({entities,relations,events,rules,resources,states,evidence,accountability,typeRegistry}: Loose = {}){
    this.entities=entities;this.relations=relations;this.events=events;this.rules=rules;this.resources=resources;this.states=states;this.evidence=evidence;this.accountability=accountability;this.typeRegistry=typeRegistry;
  }
  execute(input: Loose = {}): Loose {
    const entity = this.entities.get(input.actor) ?? this.entities.create({type:input.actorType??'PERSON',data:input.actorData??{},entityId:input.actor});
    const event = this.events.append({type:input.eventType,actor:entity.entityId,subject:input.subject??entity.entityId,place:input.place,time:input.time,context:input.context??{},evidence:input.evidence??[]});
    const rule = this.rules.resolve({jurisdiction:input.jurisdiction,asOf:input.asOf,category:input.ruleCategory,key:input.ruleKey});
    const links = (input.relations??[]).map((r: Loose)=>this.relations.link({...r,from:r.from??entity.entityId}));
    const accountability = input.accountability ? this.accountability.assess({...input.accountability,actor:entity.entityId,eventId:event.eventId,ruleId:rule?.ruleId??null}) : null;
    this.states.set(entity.entityId,input.nextState??'ACTIVE',{eventId:event.eventId});
    return {entity,event,rule,links,accountability,provenance:provenance({sourceType:'PIPELINE',sourceId:event.eventId})};
  }
}
