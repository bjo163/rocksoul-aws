import { runtimeDataset } from '@moonwitness/persistence';
import type { DomainType, TypeRuntime } from './domain-types.js';

type CatalogType = DomainType & { label?: string; fields?: unknown[] };

const relationViews: Record<string, Record<string, unknown>> = {
  'HERO_REFERENCE.PROPHET': { primaryDomain: 'REVELATION', status: 'SCRIPTURALLY_GROUNDED_REFERENCE', relations: ['SCRIPTURE_REFERENCE', 'PROPHETIC_EVENT', 'PASSAGE', 'DIVINE_RELATION', 'PLACE', 'PEOPLE', 'MISSION', 'EVIDENCE'], relationLayers: ['REVELATION', 'WORLD', 'KNOWLEDGE'] },
  DIVINE_BOOK: { primaryDomain: 'REVELATION', status: 'SOURCE_OBJECT', relations: ['PASSAGE', 'SOURCE', 'EDITION', 'MANUSCRIPT', 'EVIDENCE'], relationLayers: ['REVELATION', 'KNOWLEDGE'] },
  'DIVINE_BOOK.SURAH': { primaryDomain: 'REVELATION', status: 'SOURCE_STRUCTURE', relations: ['PASSAGE', 'BOOK', 'CONCEPT', 'PROPHET', 'EVIDENCE'], relationLayers: ['REVELATION', 'KNOWLEDGE'] },
  'KNOWLEDGE.SCRIPTURE_REFERENCE': { primaryDomain: 'KNOWLEDGE', status: 'PROVENANCE_BRIDGE', relations: ['BOOK', 'PASSAGE', 'PROPHET', 'EVENT', 'CONCEPT'], relationLayers: ['KNOWLEDGE', 'REVELATION', 'WORLD'] },
  'KNOWLEDGE.PROPHETIC_EVENT': { primaryDomain: 'WORLD', status: 'SCRIPTURALLY_GROUNDED_EVENT', relations: ['PROPHET', 'PASSAGE', 'PLACE', 'PEOPLE', 'EVIDENCE'], relationLayers: ['WORLD', 'REVELATION', 'KNOWLEDGE'] },
};

function uiSchemaFor(type: CatalogType) {
  const relationship = relationViews[type.typeId] ?? { primaryDomain: type.domain, status: 'MODEL_DEFINED', relations: ['RELATION', 'EVENT', 'EVIDENCE', 'AUDIT'], relationLayers: [type.domain] };
  return { typeId: type.typeId, title: type.label ?? type.typeId, family: type.entityFamily, route: `/m/${encodeURIComponent(type.typeId)}`, layout: 'entity', sections: type.entityFamily === 'EVENT' ? ['overview', 'context', 'relations', 'evidence', 'audit'] : ['overview', 'relations', 'events', 'resources', 'assets', 'audit'], relationship, fields: type.fields ?? [{ name: 'type', label: 'Type', kind: 'badge', path: 'type' }, { name: 'state', label: 'State', kind: 'badge', path: 'state' }, { name: 'createdAt', label: 'Created', kind: 'datetime', path: 'createdAt' }], capabilities: { create: true, read: true, update: true, delete: false, relations: true, events: true, audit: true } };
}

export class ModelRegistry {
  private readonly runtime: TypeRuntime;
  private readonly catalog = new Map<string, CatalogType>();
  constructor(runtime: TypeRuntime, { catalogPath = null }: { catalogPath?: string | null } = {}) { this.runtime = runtime; void catalogPath; this.loadCatalog(); }
  private loadCatalog() {
    try { const raw = runtimeDataset('data/kernel/type-catalog.json') as { types?: CatalogType[] }; for (const item of raw.types ?? []) this.catalog.set(item.typeId, item); } catch { /* optional catalog */ }
    for (const type of this.runtime.types.list()) this.catalog.set(type.typeId, { ...this.catalog.get(type.typeId), ...type });
  }
  list({ family = null, domain = null, q = null }: { family?: string | null; domain?: string | null; q?: string | null } = {}) { const query = String(q ?? '').toLowerCase(); return [...this.catalog.values()].filter((t) => !family || t.entityFamily === family).filter((t) => !domain || t.domain === domain).filter((t) => !query || `${t.typeId} ${t.label ?? ''} ${t.domain}`.toLowerCase().includes(query)).sort((a, b) => a.typeId.localeCompare(b.typeId)).map((t) => ({ ...t, ui: uiSchemaFor(t) })); }
  get(typeId: string) { const type = this.catalog.get(typeId); return type ? { ...type, ui: uiSchemaFor(type) } : null; }
  define(input: DomainType) { const result = this.runtime.registerType(input); this.catalog.set(result.typeId, result); return { ...result, ui: uiSchemaFor(result) }; }
  pageModel(typeId: string) { const model = this.get(typeId); if (!model) return null; return { type: model, query: { type: model.typeId }, ui: model.ui, endpoints: { list: `/api/v1/query?type=${encodeURIComponent(model.typeId)}`, create: '/api/v1/command', detail: '/api/v1/resource/:id', graph: '/api/v1/kernel/graph', evidence: '/api/v1/resource/:id/evidence', audit: '/api/v1/resource/:id/audit', replay: '/api/v1/resource/:id/replay' }, legacyEndpoints: [] }; }
}
