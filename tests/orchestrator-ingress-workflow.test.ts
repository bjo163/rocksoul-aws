import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runScheduleIngressWorkflow,
  runTriggerIngressWorkflow,
  type IngressScheduleRecord,
} from '../packages/orchestrator/src/ingress-workflow.js';

function record(overrides: Partial<IngressScheduleRecord> = {}): IngressScheduleRecord {
  return {
    ingressId: 'ING-1', idempotencyKey: 'request-1', channelId: 'KNOWLEDGE',
    scheduledAt: '2026-01-01T00:00:00.000Z', status: 'SCHEDULED', payload: {}, version: 1,
    ...overrides,
  };
}

test('schedule workflow returns existing schedule for a repeated idempotency key', async () => {
  const existing = record();
  let creates = 0;
  const result = await runScheduleIngressWorkflow({
    ingressId: 'ING-2', idempotencyKey: 'request-1', channelId: 'KNOWLEDGE',
    scheduledAt: '2026-01-02T00:00:00.000Z',
  }, {
    async loadSchedule() { return existing; },
    createSchedule() { creates += 1; return record({ ingressId: 'ING-2' }); },
  });
  assert.equal(result.idempotent, true);
  assert.equal(result.schedule.ingressId, 'ING-1');
  assert.equal(creates, 0);
});

test('trigger workflow transitions once and repeats are no-ops', async () => {
  let current = record();
  let transitions = 0;
  const ports = {
    async loadSchedule() { return current; },
    async transitionSchedule(input: { current: IngressScheduleRecord; now: string }) {
      transitions += 1;
      current = { ...input.current, status: 'TRIGGERED', triggeredAt: input.now, version: input.current.version + 1 };
      return current;
    },
  };
  const first = await runTriggerIngressWorkflow({ ingressId: 'ING-1', actorId: 'worker', now: '2026-01-01T01:00:00.000Z' }, ports);
  const second = await runTriggerIngressWorkflow({ ingressId: 'ING-1', actorId: 'worker', now: '2026-01-01T02:00:00.000Z' }, ports);
  assert.equal(first.idempotent, false);
  assert.equal(second.idempotent, true);
  assert.equal(transitions, 1);
});

test('trigger workflow fails closed for cancelled or missing ingress', async () => {
  await assert.rejects(() => runTriggerIngressWorkflow({ ingressId: 'missing', actorId: 'worker' }, {
    async loadSchedule() { return null; },
    async transitionSchedule() { throw new Error('must not write'); },
  }), /INGRESS_NOT_FOUND/);
  await assert.rejects(() => runTriggerIngressWorkflow({ ingressId: 'ING-1', actorId: 'worker' }, {
    async loadSchedule() { return record({ status: 'CANCELLED' }); },
    async transitionSchedule() { throw new Error('must not write'); },
  }), /INGRESS_CANCELLED/);
});

