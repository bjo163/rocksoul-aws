// @ts-nocheck
export class EventBus {
  constructor() { this.handlers = new Map(); }
  subscribe(type, handler) {
    if (typeof handler !== 'function') throw new Error('handler must be a function');
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler);
    this.handlers.set(type, set);
    return () => set.delete(handler);
  }
  async publish(event) {
    const handlers = [...(this.handlers.get(event.type) ?? []), ...(this.handlers.get('*') ?? [])];
    const results = [];
    for (const handler of handlers) results.push(await handler(structuredClone(event)));
    return results;
  }
}
