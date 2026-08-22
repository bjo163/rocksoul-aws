import type { PersistenceStore, SystemTraceRecord } from '../../packages/persistence/src/types.js';

import { EventEmitter } from 'node:events';

export interface TraceRecord extends SystemTraceRecord {}

export class Observability extends EventEmitter {
  private readonly traces: TraceRecord[] = [];
  
  constructor(private readonly store?: PersistenceStore) {
    super();
  }

  start(route: string, options?: { requestId?: string }): TraceRecord {
    const now = new Date().toISOString();
    return { requestId: options?.requestId || `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, correlationId: `COR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, startedAt: now, route };
  }
  
  finish(trace: TraceRecord, statusCode: number, error?: unknown): TraceRecord {
    const completedAt = new Date().toISOString();
    const finished = { ...trace, completedAt, statusCode, durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(trace.startedAt)), ...(error ? { error: error instanceof Error ? error.message : String(error) } : {}) };
    this.traces.push(finished);
    if (this.traces.length > 1000) this.traces.shift();
    if (this.store) this.store.traceRepository().put(finished).catch(e => console.error('[OBSERVABILITY] Failed to persist trace', e));
    this.emit('trace', finished);
    return finished;
  }
  
  recent(limit = 100): TraceRecord[] { return this.traces.slice(-Math.max(1, limit)); }
}
