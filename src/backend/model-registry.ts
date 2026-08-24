// @ts-nocheck
import { runtimeDataset } from '../persistence/runtime-data.js';

const relationViews = Object.freeze({
  'HERO_REFERENCE.PROPHET': {
    primaryDomain: 'REVELATION',
    status: 'SCRIPTURALLY_GROUNDED_REFERENCE',
    sourceRule: 'Use explicit/corroborated source links; do not infer unsupported biography.',
    relations: [
      'SCRIPTURE_REFERENCE',
      'PROPHETIC_EVENT',
      'PASSAGE',
      'DIVINE_RELATION',
      'PLACE',
      'PEOPLE',
      'MISSION',
      'EVIDENCE',
    ],
    relationLayers: ['REVELATION', 'WORLD', 'KNOWLEDGE'],
    separation: {
      core: ['explicit scripture reference', 'scriptural event reference', 'source provenance'],
      derived: ['historical reconstruction', 'research hypothesis', 'AI inference'],
      unresolved: ['conflicted identity', 'unsupported chronology', 'unverified tradition'],
    },
  },
  'DIVINE_BOOK': {
    primaryDomain: 'REVELATION',
    status: 'SOURCE_OBJECT',
    relations: ['PASSAGE', 'SOURCE', 'EDITION', 'MANUSCRIPT', 'EVIDENCE'],
    relationLayers: ['REVELATION', 'KNOWLEDGE'],
  },
  'DIVINE_BOOK.SURAH': {
    primaryDomain: 'REVELATION',
    status: 'SOURCE_STRUCTURE',
    relations: ['PASSAGE', 'BOOK', 'CONCEPT', 'PROPHET', 'EVIDENCE'],
    relationLayers: ['REVELATION', 'KNOWLEDGE'],
  },
  'KNOWLEDGE.SCRIPTURE_REFERENCE': {
    primaryDomain: 'KNOWLEDGE',
    status: 'PROVENANCE_BRIDGE',
    relations: ['BOOK', 'PASSAGE', 'PROPHET', 'EVENT', 'CONCEPT'],
    relationLayers: ['KNOWLEDGE', 'REVELATION', 'WORLD'],
  },
  'KNOWLEDGE.PROPHETIC_EVENT': {
    primaryDomain: 'WORLD',
    status: 'SCRIPTURALLY_GROUNDED_EVENT',
    relations: ['PROPHET', 'PASSAGE', 'PLACE', 'PEOPLE', 'EVIDENCE'],
    relationLayers: ['WORLD', 'REVELATION', 'KNOWLEDGE'],
  },
});

function relationViewFor(type) {
  return relationViews[type.typeId] ?? {
    primaryDomain: type.domain ?? 'WORLD',
    status: 'MODEL_DEFINED',
    relations: ['RELATION', 'EVENT', 'EVIDENCE', 'AUDIT'],
    relationLayers: [type.domain ?? 'WORLD'],
  };
}

function uiSchemaFor(type) {
  const family = type.entityFamily ?? 'ENTITY';
  const relationship = relationViewFor(type);
  const base = {
    typeId: type.typeId,
    title: type.label ?? type.typeId,
    family,
    route: `/m/${encodeURIComponent(type.typeId)}`,
    layout: 'entity',
    sections: ['overview', 'relations', 'events', 'resources', 'assets', 'audit'],
    relationship,
    fields: type.fields ?? [
      {name: 'type', label: 'Type', kind: 'badge', path: 'type'},
      {name: 'state', label: 'State', kind: 'badge', path: 'state'},
      {name: 'createdAt', label: 'Created', kind: 'datetime', path: 'createdAt'},
    ],
    capabilities: {
      create: true,
      read: true,
      update: true,
      delete: false,
      relations: true,
      events: true,
      audit: true,
    },
  };
  if (family === 'EVENT') base.sections = ['overview', 'context', 'relations', 'evidence', 'audit'];
  if (family === 'RESOURCE_FLOW') base.sections = ['overview', 'flow', 'relations', 'rules', 'audit'];
  if (family === 'ASSET') base.sections = ['overview', 'lifecycle', 'relations', 'finance', 'risk', 'audit'];
  return base;
}

export class ModelRegistry {
  constructor(runtime, {catalogPath = null} = {}) {
    this.runtime = runtime;
    this.catalogPath = catalogPath;
    this.catalog = new Map();
    this.loadCatalog();
  }

  loadCatalog() {
    if (this.catalogPath) {
      const raw = runtimeDataset('data/kernel/type-catalog.json');
      for (const item of raw.types ?? []) this.catalog.set(item.typeId, item);
    } else {
      try { const raw = runtimeDataset('data/kernel/type-catalog.json'); for (const item of raw.types ?? []) this.catalog.set(item.typeId, item); } catch {}
    }
    for (const type of this.runtime.types.list()) {
      this.catalog.set(type.typeId, {...this.catalog.get(type.typeId), ...type});
    }
  }

  list({family = null, domain = null, q = null} = {}) {
    const query = String(q ?? '').toLowerCase();
    return [...this.catalog.values()]
      .filter(t => !family || t.entityFamily === family)
      .filter(t => !domain || t.domain === domain)
      .filter(t => !query || `${t.typeId} ${t.label ?? ''} ${t.domain ?? ''}`.toLowerCase().includes(query))
      .sort((a,b) => a.typeId.localeCompare(b.typeId))
      .map(t => ({...t, ui: uiSchemaFor(t)}));
  }

  get(typeId) {
    const type = this.catalog.get(typeId);
    return type ? {...type, ui: uiSchemaFor(type)} : null;
  }

  define(input) {
    const result = this.runtime.registerType(input);
    this.catalog.set(result.typeId, result);
    return {...result, ui: uiSchemaFor(result)};
  }

  pageModel(typeId) {
    const model = this.get(typeId);
    if (!model) return null;
    return {
      type: model,
      query: {type: model.typeId},
      ui: model.ui,
      endpoints: {
        list: `/api/v1/query?type=${encodeURIComponent(model.typeId)}`,
        create: '/api/v1/command',
        detail: '/api/v1/resource/:id',
        graph: '/api/v1/kernel/graph',
        evidence: '/api/v1/resource/:id/evidence',
        audit: '/api/v1/resource/:id/audit',
        replay: '/api/v1/resource/:id/replay',
      },
      legacyEndpoints: [],
    };
  }
}
