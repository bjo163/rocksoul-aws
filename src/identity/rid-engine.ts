// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRid, createPersonRecord, assertIdentityLinks } from '../core/rid.js';

export class RidEngine {
  constructor({storePath='./data/runtime/rid-registry.json'}={}) {
    this.storePath = storePath;
    fs.mkdirSync(path.dirname(storePath), {recursive:true});
    this.records = fs.existsSync(storePath) ? JSON.parse(fs.readFileSync(storePath,'utf8')) : {};
  }
  save() { fs.writeFileSync(this.storePath, JSON.stringify(this.records,null,2)); }
  create(input={}) {
    const r = createPersonRecord(input); assertIdentityLinks(r);
    this.records[r.rid] = r; this.save(); return r;
  }
  get(rid) { return this.records[rid] ?? null; }
  link(rid, patch={}) {
    const current = this.get(rid); if (!current) throw new Error(`Unknown RID: ${rid}`);
    const next = {...current, ...patch, rid, updatedAt:new Date().toISOString()};
    assertIdentityLinks(next); this.records[rid]=next; this.save(); return next;
  }
  timeline(rid) {
    const r=this.get(rid); return r ? (r.timeline ?? []) : [];
  }
  appendTimeline(rid, event) {
    const r=this.get(rid); if(!r) throw new Error(`Unknown RID: ${rid}`);
    r.timeline ??=[];
    r.timeline.push({eventId:`LIFE_${crypto.randomUUID()}`, recordedAt:new Date().toISOString(), ...event});
    r.updatedAt=new Date().toISOString(); this.save(); return r.timeline.at(-1);
  }
  list() { return Object.values(this.records); }
}

export { createRid };
