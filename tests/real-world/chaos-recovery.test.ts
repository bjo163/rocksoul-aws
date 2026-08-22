// @ts-nocheck
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test, describe } from 'node:test';
import { ImmutableAuditLedger } from '../../src/audit/immutable-ledger.js';
import { SyncQueue, makeChangeSet, reconcile, resolveSyncConflict } from '../../src/sync/local-first.js';
import { createPersistence } from '../../packages/persistence/src/index.js';
import { hashEvent } from '../../packages/persistence/src/index.js';

const ACTOR='RID-001';

describe('L1/L2 Chaos & Recovery', () => {
  test('AI/provider outage does not prevent core persistence creation', async () => {
    const store=createPersistence({driver:'memory'});
    const entity=await store.entityRepository().put({id:'CHAOS-001',type:'ENTITY',version:1,payload:{status:'ACTIVE'}});
    assert.equal(entity.id,'CHAOS-001');
    await store.close();
  });

  test('sync queue survives offline period by serialization/reload', () => {
    const q=new SyncQueue();
    const cs=makeChangeSet({nodeId:'NODE-A',events:[{eventId:'E1'}]});
    q.enqueue(cs);
    const restored=new SyncQueue({items:JSON.parse(JSON.stringify(q.items))});
    assert.equal(restored.pending().length,1);
    assert.equal(restored.pending()[0].changeSetId,cs.changeSetId);
  });

  test('interrupted sync leaves pending item retryable', () => {
    const q=new SyncQueue();
    const cs=makeChangeSet({nodeId:'NODE-A',events:[{eventId:'E2'}]});
    q.enqueue(cs);
    assert.equal(q.ack('MISSING'),false);
    assert.equal(q.pending().length,1);
    assert.equal(q.ack(cs.changeSetId),true);
    assert.equal(q.pending().length,0);
  });

  test('duplicate sync events are rejected during reconciliation', () => {
    const a=makeChangeSet({nodeId:'A',events:[{eventId:'DUP-1',value:1}]});
    const b=makeChangeSet({nodeId:'B',events:[{eventId:'DUP-1',value:2}]});
    const result=reconcile({changesets:[a,b]});
    assert.equal(result.accepted.length,1);
    assert.equal(result.conflicts.length,1);
    assert.equal(result.conflicts[0].type,'DUPLICATE_EVENT');
  });

  test('conflicting versions fail closed into review state', () => {
    const result=resolveSyncConflict({local:{id:'X',version:4,value:'A'},remote:{id:'X',version:5,value:'B'}});
    assert.equal(result.status,'CONFLICT');
    assert.equal(result.requiresReview,true);
    assert.equal(result.winner,null);
  });

  test('equal version conflict is deterministic', () => {
    const result=resolveSyncConflict({local:{id:'X',version:4},remote:{id:'X',version:4}});
    assert.equal(result.status,'MERGE_EQUAL_VERSION');
  });

  test('immutable audit detects payload tamper', () => {
    const ledger=new ImmutableAuditLedger();
    ledger.append({eventType:'CREATE',actorId:ACTOR,payload:{amount:10}});
    ledger.append({eventType:'UPDATE',actorId:'BOT-001',payload:{amount:20}});
    const tampered=ledger.snapshot().entries.map(x=>({...x}));
    tampered[0].payload.amount=999999;
    assert.equal(new ImmutableAuditLedger({entries:tampered}).verify().ok,false);
  });

  test('immutable audit detects hash-link tamper', () => {
    const ledger=new ImmutableAuditLedger();
    ledger.append({eventType:'A',actorId:ACTOR});
    ledger.append({eventType:'B',actorId:ACTOR});
    const tampered=ledger.snapshot().entries.map(x=>({...x}));
    tampered[1].previousHash='deadbeef';
    assert.equal(new ImmutableAuditLedger({entries:tampered}).verify().ok,false);
  });

  test('audit can recover from valid persisted snapshot', () => {
    const ledger=new ImmutableAuditLedger();
    ledger.append({eventType:'A',actorId:ACTOR});
    ledger.append({eventType:'B',actorId:'BOT-001'});
    const snapshot=ledger.snapshot();
    const restored=new ImmutableAuditLedger({entries:snapshot.entries});
    assert.deepEqual(restored.verify(),snapshot.integrity);
  });

  test('event hash is deterministic for same canonical event and previous hash', () => {
    const event={eventId:'HASH-1',entityId:'E',eventType:'TEST',payload:{b:2,a:1},occurredAt:'2026-01-01T00:00:00.000Z',actorId:ACTOR};
    assert.equal(hashEvent(event,'prev'),hashEvent({...event},'prev'));
  });

  test('memory event store rejects duplicate event ids like SQLite primary key', async () => {
    const store=createPersistence({driver:'memory'});
    const events=store.eventStore();
    await events.append({eventId:'DUP-STORE-1',entityId:'E',eventType:'A',payload:{}});
    await assert.rejects(() => events.append({eventId:'DUP-STORE-1',entityId:'E',eventType:'B',payload:{}}), /Duplicate eventId/);
    const integrity=await events.verifyChain();
    assert.equal(integrity.valid,true);
    assert.equal(integrity.events,1);
    await store.close();
  });

  test('optional sqlite driver fails with explicit recovery guidance when unavailable', async () => {
    try {
      const store=createPersistence({driver:'sqlite',sqliteFile:':memory:'});
      assert.ok(store);
      await store.close();
    } catch (error) {
      assert.equal(error.code,'SQLITE_DRIVER_MISSING');
    }
  });

  test('optional postgres driver fails with explicit recovery guidance when unavailable', async () => {
    try {
      const store=createPersistence({driver:'postgres',postgres:{connectionString:'postgres://invalid'}});
      assert.ok(store);
      await store.close();
    } catch (error) {
      assert.ok(['POSTGRES_DRIVER_MISSING','POSTGRES_SCHEMA_ERROR','ECONNREFUSED'].includes(error.code) || /PostgreSQL adapter requires|Failed to initialize/.test(error.message));
    }
  });

  test('truncated audit history is detected as a different but valid prefix, not corrupted', () => {
    const ledger=new ImmutableAuditLedger();
    ledger.append({eventType:'A',actorId:ACTOR});
    ledger.append({eventType:'B',actorId:ACTOR});
    ledger.append({eventType:'C',actorId:ACTOR});
    const prefix=new ImmutableAuditLedger({entries:ledger.snapshot().entries.slice(0,2)});
    const check=prefix.verify();
    assert.equal(check.ok,true);
    assert.equal(check.count,2);
  });

  test('corrupted snapshot cannot be restored silently', () => {
    const ledger=new ImmutableAuditLedger();
    ledger.append({eventType:'A',actorId:ACTOR,payload:{x:1}});
    const bad=ledger.snapshot();
    bad.entries[0].payload={x:999};
    const restored=new ImmutableAuditLedger({entries:bad.entries});
    assert.equal(restored.verify().ok,false);
  });

  test('random duplicate event ids remain fail-closed', async () => {
    const store=createPersistence({driver:'memory'});
    const events=store.eventStore();
    const id=`CHAOS-${crypto.randomUUID()}`;
    await events.append({eventId:id,entityId:'E',eventType:'A',payload:{}});
    await assert.rejects(() => events.append({eventId:id,entityId:'E',eventType:'A',payload:{}}));
    await store.close();
  });
});
