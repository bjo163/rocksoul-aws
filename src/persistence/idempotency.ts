import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import crypto from 'node:crypto';

export interface IdempotencyRecord {
  key: string;
  requestHash: string;
  statusCode: number;
  body: unknown;
  createdAt: string;
}

export class IdempotencyStore {
  private readonly file: string;
  private loaded = false;
  private records = new Map<string, IdempotencyRecord>();
  private inFlight = new Map<string, Promise<{ statusCode: number; body: unknown }>>();

  constructor(filePath: string) {
    this.file = filePath;
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = JSON.parse(await readFile(this.file, 'utf8')) as unknown;
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (item && typeof item === 'object' && 'key' in item && 'requestHash' in item) {
            const r = item as IdempotencyRecord;
            this.records.set(r.key, r);
          }
        }
      }
    } catch {
      // First run: empty store.
    }
  }

  private async flush(): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await writeFile(tmp, JSON.stringify([...this.records.values()], null, 2));
    await rename(tmp, this.file);
  }

  static hash(input: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(input ?? null)).digest('hex');
  }

  async get(key: string): Promise<IdempotencyRecord | null> {
    await this.load();
    return this.records.get(key) ?? null;
  }

  async put(record: IdempotencyRecord): Promise<void> {
    await this.load();
    this.records.set(record.key, record);
    await this.flush();
  }

  async execute<T>(key: string | null, requestHash: string, work: () => Promise<{ statusCode: number; body: T }>): Promise<{ statusCode: number; body: T }> {
    if (!key) return work();
    const existing = await this.get(key);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        const error = new Error('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD');
        Object.assign(error, { code: 'IDEMPOTENCY_CONFLICT', statusCode: 409 });
        throw error;
      }
      return { statusCode: existing.statusCode, body: existing.body as T };
    }
    const pending = this.inFlight.get(key);
    if (pending) {
      await pending;
      const completed = await this.get(key);
      if (!completed || completed.requestHash !== requestHash) {
        const error = new Error('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD');
        Object.assign(error, { code: 'IDEMPOTENCY_CONFLICT', statusCode: 409 });
        throw error;
      }
      return { statusCode: completed.statusCode, body: completed.body as T };
    }
    const execution = (async () => {
      const result = await work();
      await this.put({ key, requestHash, statusCode: result.statusCode, body: result.body, createdAt: new Date().toISOString() });
      return result as { statusCode: number; body: unknown };
    })();
    this.inFlight.set(key, execution);
    try {
      return await execution as { statusCode: number; body: T };
    } finally {
      this.inFlight.delete(key);
    }
  }
}
