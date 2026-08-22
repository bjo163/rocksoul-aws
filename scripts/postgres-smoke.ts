import assert from 'node:assert/strict';
import { createPersistence } from '../packages/persistence/src/factory.js';
import { loadSeedManifest, seedDatabase } from '../packages/persistence/src/bootstrap.js';
import { getLatestSchemaVersion } from '../packages/persistence/src/schema.js';

const driver = (process.env.STORAGE_DRIVER ?? 'postgres').toLowerCase();
if (driver !== 'postgres') throw new Error('postgres:smoke requires STORAGE_DRIVER=postgres');

const store = createPersistence({ driver: 'postgres' });
await store.ready?.();
const entities = store.entityRepository();
const events = store.eventStore();
const audit = store.auditStore();

const all = await entities.list();
const byType = new Map<string, number>();
for (const e of all) byType.set(e.type, (byType.get(e.type) ?? 0) + 1);

const manifest = await loadSeedManifest(process.cwd());
const expectedSeed = await seedDatabase(process.cwd(), { driver: 'memory' });
assert.equal(getLatestSchemaVersion(), 5);
assert.ok(all.length >= expectedSeed.seeded, `expected at least ${expectedSeed.seeded} entities, got ${all.length}`);

const duplicateIds = all.length - new Set(all.map((e) => e.id)).size;
assert.equal(duplicateIds, 0);
const coreTypes = [
  'QURAN_AYAH',
  'QURAN_SURAH',
  'DIVINE_BOOK.TAWRAT_WITNESS_PASSAGE',
  'DIVINE_BOOK.ZABUR_WITNESS_PASSAGE',
  'DIVINE_BOOK.INJIL_WITNESS_PASSAGE',
];
for (const type of coreTypes) assert.ok((byType.get(type) ?? 0) > 0, `missing seeded type ${type}`);

const eventChain = await events.verifyChain();
const auditChain = await audit.verify();
assert.equal(eventChain.valid, true);
assert.equal(auditChain.valid, true);

const probeId = `SMOKE-ENTITY-${Date.now()}`;
await entities.put({ id: probeId, type: 'SMOKE.TEST', version: 1, payload: { createdBy: 'postgres-smoke' } });
const probe = await entities.get(probeId);
assert.equal(probe?.payload.createdBy, 'postgres-smoke');
await events.append({ eventId: `${probeId}-EVENT`, entityId: probeId, eventType: 'SMOKE', payload: { ok: true }, actorId: 'SMOKE' });
const afterEventChain = await events.verifyChain();
assert.equal(afterEventChain.valid, true);
const afterAuditChain = await audit.verify();
assert.equal(afterAuditChain.valid, true);

console.log(JSON.stringify({
  ok: true,
  schemaVersion: getLatestSchemaVersion(),
  manifestSources: manifest.sources.length,
  expectedSeedEntities: expectedSeed.seeded,
  actualEntities: all.length,
  coreTypes: Object.fromEntries(coreTypes.map((t) => [t, byType.get(t) ?? 0])),
  eventChain: afterEventChain,
  auditChain: afterAuditChain,
  smokeEntity: probeId,
}, null, 2));
await store.close();
