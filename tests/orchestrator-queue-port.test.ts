import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  JobHandler,
  JobQueuePort,
  JobRecord,
  WorkerQueuePort,
} from '../packages/orchestrator/src/queue-port.js';
import { isTerminalJobStatus } from '../packages/orchestrator/src/queue-port.js';

test('queue port keeps enqueue, lookup, listing, and processing host-neutral', async () => {
  const handlers = new Map<string, JobHandler>();
  const records = new Map<string, JobRecord>();
  const queue: JobQueuePort = {
    async enqueue<T>(type: string, payload: T): Promise<JobRecord<T>> {
      const record: JobRecord<T> = {
        id: 'JOB-1', type, status: 'QUEUED', payload,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      };
      records.set(record.id, record);
      return record;
    },
    async get(id) { return records.get(id) ?? null; },
    async list(status) { return [...records.values()].filter((job) => !status || job.status === status); },
    register(type, handler) { handlers.set(type, handler); },
    async processAvailable() {
      const record = records.get('JOB-1');
      const handler = record && handlers.get(record.type);
      if (!record || !handler) return [];
      record.status = 'COMPLETED';
      record.result = await handler(record.payload);
      return [record];
    },
  };

  queue.register<{ value: number }, number>('SUM', async ({ value }) => value + 1);
  const created = await queue.enqueue('SUM', { value: 41 });
  assert.equal(created.status, 'QUEUED');
  assert.deepEqual((await queue.processAvailable())[0]?.result, 42);
  assert.equal((await queue.get('JOB-1'))?.status, 'COMPLETED');
  assert.equal((await queue.list('QUEUED')).length, 0);
});

test('worker queue port separates lifecycle from queue operations', () => {
  const calls: string[] = [];
  const queue: WorkerQueuePort = {
    enqueue: async () => ({ id: 'JOB-1', type: 'X', status: 'QUEUED', payload: null, createdAt: '', updatedAt: '' }),
    get: async () => null,
    list: async () => [],
    register: () => undefined,
    processAvailable: async () => [],
    start: () => calls.push('start'),
    stop: () => calls.push('stop'),
  };
  queue.start();
  queue.stop();
  assert.deepEqual(calls, ['start', 'stop']);
});

test('terminal status helper preserves current queue semantics', () => {
  assert.equal(isTerminalJobStatus('QUEUED'), false);
  assert.equal(isTerminalJobStatus('RUNNING'), false);
  assert.equal(isTerminalJobStatus('COMPLETED'), true);
  assert.equal(isTerminalJobStatus('FAILED'), true);
});
