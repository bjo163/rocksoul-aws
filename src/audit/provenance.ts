// @ts-nocheck
import crypto from 'node:crypto';
export function provenanceLink({ kind, id, version = null, role = 'SOURCE', authorityClass = null, confidence = 0.5, metadata = {} } = {}) {
    if (!kind || !id)
        throw new Error('provenance link requires kind and id');
    return { provenanceId: `PROV15_${crypto.randomUUID()}`, kind, id, version, role, authorityClass, confidence, metadata, createdAt: new Date().toISOString() };
}
export function buildDecisionProvenance({ sources = [], claims = [], rules = [], model = null, analyzerVersion = '2.15.0' } = {}) {
    const links = [];
    for (const s of sources)
        links.push(provenanceLink({ kind: 'KNOWLEDGE', id: s.knowledgeId ?? s.id, version: s.version ?? s.edition ?? null, role: 'SOURCE', authorityClass: s.authorityClass, confidence: s.confidence ?? 0.8 }));
    for (const c of claims)
        links.push(provenanceLink({ kind: 'CLAIM', id: c.claimId ?? c.id, version: c.version ?? null, role: 'CLAIM', confidence: c.confidence ?? 0.6 }));
    for (const r of rules)
        links.push(provenanceLink({ kind: 'RULE', id: r.ruleId ?? r.key ?? r.id, version: r.version ?? r.effectiveFrom ?? null, role: 'RULE', authorityClass: r.authorityClass, confidence: r.confidence ?? 0.8 }));
    if (model)
        links.push(provenanceLink({ kind: 'MODEL', id: model.id ?? model.name ?? 'MODEL', version: model.version ?? analyzerVersion, role: 'MODEL', confidence: model.confidence ?? 0.7 }));
    return { version: analyzerVersion, links };
}
//# sourceMappingURL=provenance.js.map