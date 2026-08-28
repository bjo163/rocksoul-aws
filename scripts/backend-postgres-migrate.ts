import fs from 'node:fs';
import path from 'node:path';
import { UniverseStore } from '@moonwitness/persistence';
import { loadDatabaseConfig } from '../src/config-loader.js';

function readJson(file: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

async function main() {
  if ((process.env.STORAGE_DRIVER ?? 'postgres') !== 'postgres') throw new Error('BACKEND_POSTGRES_MIGRATE_REQUIRES_STORAGE_DRIVER_POSTGRES');
  const root = process.cwd();
  const dataDir = path.resolve(process.env.MOONWITNESS_DATA_DIR ?? '.data');
  const candidateDirs = [dataDir, path.join(dataDir, 'legacy-backend')];
  const legacyDir = candidateDirs.find((dir) => fs.existsSync(path.join(dir, 'backend-state.json')) || fs.existsSync(path.join(dir, 'audit-ledger.json')) || fs.existsSync(path.join(dir, 'types.json'))) ?? path.join(dataDir, 'legacy-backend');
  const config = loadDatabaseConfig(root);
  const store = new UniverseStore({ driver: 'postgres', dataDir: path.join(dataDir, 'universe'), postgres: config.storage?.postgres });
  await store.persistence.ready();
  const entityRepo = store.persistence.entities();
  const relationRepo = store.persistence.relations();
  const eventRepo = store.persistence.events();
  const auditRepo = store.persistence.auditStore();
  const summary = { entities: 0, relations: 0, events: 0, audit: 0, types: 0 };

  const state = readJson(path.join(legacyDir, 'backend-state.json'), null);
  if (state) {
    for (const entity of state.entities ?? []) {
      await entityRepo.put({ id: `BACKEND:ENTITY:${entity.entityId}`, type: 'BACKEND.ENTITY', version: 1, payload: { entity }, createdBy: 'MIGRATION', updatedBy: 'MIGRATION' });
      summary.entities++;
    }
    for (const relation of state.relations ?? []) {
      await relationRepo.put({ id: relation.relationId, fromId: relation.from, type: relation.type, toId: relation.to, validFrom: relation.validFrom, validTo: relation.validTo, payload: { ...relation.metadata, source: relation.source }, createdBy: 'MIGRATION', updatedBy: 'MIGRATION' });
      summary.relations++;
    }
    for (const event of state.events ?? []) {
      if (!event.subject && !event.actor) continue;
      await eventRepo.append({ eventId: event.eventId, entityId: event.subject ?? event.actor, eventType: event.type, payload: { _backendGraph: true, place: event.place, context: event.context, evidence: event.evidence, links: event.links }, occurredAt: event.time, source: 'LEGACY-MIGRATION', actorId: event.actor ?? null, createdBy: 'MIGRATION', updatedBy: 'MIGRATION' });
      summary.events++;
    }
    for (const resource of state.resources ?? []) {
      await entityRepo.put({ id: `BACKEND:RESOURCE:${resource.resourceId}`, type: 'BACKEND.RESOURCE', version: 1, payload: { resource }, createdBy: 'MIGRATION', updatedBy: 'MIGRATION' });
      summary.entities++;
    }
    for (const asset of state.assets ?? []) {
      await entityRepo.put({ id: `BACKEND:ASSET:${asset.assetId}`, type: 'BACKEND.ASSET', version: 1, payload: { asset }, createdBy: 'MIGRATION', updatedBy: 'MIGRATION' });
      summary.entities++;
    }
  }

  const ledger = readJson(path.join(legacyDir, 'audit-ledger.json'), { entries: [] });
  for (const entry of ledger.entries ?? []) {
    await auditRepo.append({ auditId: entry.ledgerId, operation: entry.type === 'ENTITY_DELETED' ? 'DELETE' : entry.type === 'ENTITY_UPDATED' ? 'UPDATE' : 'CREATE', modelType: entry.payload?.type ?? 'BACKEND.LEGACY', recordId: entry.entityId ?? entry.eventId ?? entry.ledgerId, actorId: entry.actor ?? 'MIGRATION', timestamp: entry.recordedAt ?? new Date().toISOString(), changedFields: [], before: null, after: entry.payload ?? null, reason: 'LEGACY_BACKEND_MIGRATION' });
    summary.audit++;
  }

  const types = readJson(path.join(legacyDir, 'types.json'), { types: [] });
  for (const type of types.types ?? []) {
    await entityRepo.put({ id: `TYPE:${type.typeId}`, type: 'BACKEND.TYPE', version: 1, payload: { type }, createdBy: 'MIGRATION', updatedBy: 'MIGRATION' });
    summary.types++;
  }

  const verification = {
    audit: await auditRepo.verify(),
    events: await eventRepo.verifyChain(),
    persistedBackendEntities: (await entityRepo.list('BACKEND.ENTITY')).length,
  };
  console.log(JSON.stringify({ ok: true, summary, verification }, null, 2));
  await store.close();
}

main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1; });
