type Loose = Record<string, any>;
import crypto from 'node:crypto';

export class EventStore {
  declare events: Map<string, Loose>;
  constructor() { this.events = new Map(); }
  append({type, actor=null, subject=null, place=null, time=null, context={}, evidence=[], links=[]}: Loose = {}): Loose {
    if(!type) throw new Error('Event type is required');
    const eventId=`EVT_${crypto.randomUUID()}`;
    const event={eventId,type,actor,subject,place,time:time??new Date().toISOString(),context,evidence,links,createdAt:new Date().toISOString()};
    this.events.set(eventId,event); return structuredClone(event);
  }
  get(eventId: string): Loose | null {const e=this.events.get(eventId); return e?structuredClone(e):null;}
  list({type=null,actor=null,subject=null}: Loose = {}): Loose[] {return [...this.events.values()].filter(e=>(!type||e.type===type)&&(!actor||e.actor===actor)&&(!subject||e.subject===subject)).map(x=>structuredClone(x));}
}
