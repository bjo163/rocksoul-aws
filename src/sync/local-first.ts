// @ts-nocheck
import crypto from 'node:crypto';

export function makeChangeSet({nodeId, events=[]}={}) {
  if (!nodeId) throw new Error('nodeId is required');
  return { changeSetId:`CS_${crypto.randomUUID()}`, nodeId, createdAt:new Date().toISOString(), events };
}

export class SyncQueue {
  constructor({items=[]}={}) { this.items=[...items]; }
  enqueue(changeSet) { this.items.push({...changeSet, status:'PENDING'}); return this.items.at(-1); }
  pending() { return this.items.filter(x=>x.status==='PENDING').map(x=>structuredClone(x)); }
  ack(changeSetId) { const item=this.items.find(x=>x.changeSetId===changeSetId); if(!item) return false; item.status='ACKED'; item.ackedAt=new Date().toISOString(); return true; }
  reject(changeSetId, reason) { const item=this.items.find(x=>x.changeSetId===changeSetId); if(!item) return false; item.status='REJECTED'; item.reason=reason; return true; }
}

export function resolveSyncConflict({local, remote, policy='REVIEW'}={}) {
  if (!local || !remote) throw new Error('local and remote are required');
  if (local.version === remote.version) return {status:'MERGE_EQUAL_VERSION', winner:null};
  if (policy === 'AUTHORITATIVE_REMOTE') return {status:'RESOLVED', winner:'REMOTE'};
  if (policy === 'AUTHORITATIVE_LOCAL') return {status:'RESOLVED', winner:'LOCAL'};
  return {status:'CONFLICT', winner:null, requiresReview:true, candidates:[local, remote]};
}

export function reconcile({changesets=[]}={}) {
  const seen = new Set();
  const conflicts=[]; const accepted=[];
  for (const cs of changesets) for (const event of cs.events ?? []) {
    if (seen.has(event.eventId)) conflicts.push({eventId:event.eventId,type:'DUPLICATE_EVENT'});
    else { seen.add(event.eventId); accepted.push(event); }
  }
  return {accepted, conflicts};
}
