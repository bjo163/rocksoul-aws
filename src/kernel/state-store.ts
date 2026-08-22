type Loose = Record<string, any>;
export class StateStore {
  declare states: Map<string, Loose>;
  constructor(){this.states=new Map();}
  set(entityId: string,state: any,metadata: Loose = {}): Loose {const current=this.states.get(entityId);const record={entityId,state,previous:current?.state??null,metadata,changedAt:new Date().toISOString()};this.states.set(entityId,record);return {...record};}
  get(entityId: string): Loose | null {const s=this.states.get(entityId);return s?{...s}:null;}
}
