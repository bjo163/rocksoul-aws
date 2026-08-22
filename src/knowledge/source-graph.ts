// @ts-nocheck
import crypto from 'node:crypto';
export const KNOWLEDGE_TYPES = Object.freeze([
    'QURAN', 'BIBLE', 'TORAH', 'PSALMS', 'GOSPEL', 'HADITH', 'TAFSIR', 'COMMENTARY',
    'HISTORICAL_TEXT', 'MANUSCRIPT', 'EDITION', 'TRANSLATION', 'LEGAL_TEXT', 'SCIENTIFIC_TEXT',
    'NEWS', 'SCHOLARLY_WORK', 'SOCIAL_MEDIA', 'OTHER'
]);
const id = p => `${p}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
export class KnowledgeGraph {
    constructor({ records = [], relations = [] } = {}) {
        this.records = new Map(records.map(x => [x.knowledgeId, x]));
        this.relations = new Map(relations.map(x => [x.relationId, x]));
    }
    add(record = {}) {
        if (!record.type || !KNOWLEDGE_TYPES.includes(record.type))
            throw new Error(`Unsupported knowledge type: ${record.type}`);
        if (!record.text && !record.title)
            throw new Error('Knowledge record requires text or title');
        const item = {
            knowledgeId: record.knowledgeId ?? id('KNW'),
            type: record.type,
            tradition: record.tradition ?? null,
            title: record.title ?? null,
            edition: record.edition ?? null,
            language: record.language ?? null,
            collection: record.collection ?? null,
            section: record.section ?? null,
            reference: record.reference ?? null,
            text: record.text ?? null,
            translation: record.translation ?? null,
            authorityClass: record.authorityClass ?? 'UNKNOWN',
            provenance: record.provenance ?? [],
            metadata: record.metadata ?? {},
            createdAt: record.createdAt ?? now(),
            updatedAt: now()
        };
        this.records.set(item.knowledgeId, item);
        return structuredClone(item);
    }
    get(knowledgeId) { const x = this.records.get(knowledgeId); return x ? structuredClone(x) : null; }
    search({ q = '', type = null, tradition = null, reference = null, limit = 25 } = {}) {
        const needle = String(q).toLowerCase().trim();
        return [...this.records.values()].filter(x => (!type || x.type === type) &&
            (!tradition || x.tradition === tradition) &&
            (!reference || String(x.reference ?? '') === String(reference)) &&
            (!needle || `${x.title ?? ''} ${x.text ?? ''} ${x.translation ?? ''} ${x.reference ?? ''}`.toLowerCase().includes(needle))).slice(0, limit).map(x => structuredClone(x));
    }
    link({ from, type, to, metadata = {} } = {}) {
        if (!from || !type || !to)
            throw new Error('Knowledge relation requires from, type and to');
        const relation = { relationId: id('KREL'), from, type, to, metadata, createdAt: now() };
        this.relations.set(relation.relationId, relation);
        return structuredClone(relation);
    }
    graph(knowledgeId) {
        return {
            node: this.get(knowledgeId),
            relations: [...this.relations.values()].filter(r => r.from === knowledgeId || r.to === knowledgeId).map(x => structuredClone(x))
        };
    }
    snapshot() {
        return { records: [...this.records.values()].map(x => structuredClone(x)), relations: [...this.relations.values()].map(x => structuredClone(x)) };
    }
}
export function normalizeKnowledgeType(input) {
    const s = String(input ?? '').toUpperCase();
    const aliases = {
        QURAN: 'QURAN', "QUR'AN": 'QURAN', ALQURAN: 'QURAN',
        BIBLE: 'BIBLE', BIBEL: 'BIBLE',
        TORAH: 'TORAH', TAURAT: 'TORAH',
        HADITH: 'HADITH', HADIS: 'HADITH',
        TAFSIR: 'TAFSIR', COMMENTARY: 'COMMENTARY',
        HISTORY: 'HISTORICAL_TEXT', HISTORICAL: 'HISTORICAL_TEXT',
        LAW: 'LEGAL_TEXT', LEGAL: 'LEGAL_TEXT',
        NEWS: 'NEWS', ARTICLE: 'NEWS',
        SCIENCE: 'SCIENTIFIC_TEXT', SCIENTIFIC: 'SCIENTIFIC_TEXT'
    };
    return aliases[s] ?? 'OTHER';
}
//# sourceMappingURL=source-graph.js.map