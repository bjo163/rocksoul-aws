// @ts-nocheck
const norm = v => String(v ?? '').trim().toUpperCase();
export const CONFLICT_STATUS = Object.freeze({
    NONE: 'NONE',
    POTENTIAL: 'POTENTIAL_CONFLICT',
    ACTUAL: 'ACTUAL_CONFLICT',
    UNRESOLVED: 'UNRESOLVED'
});
const authorityRank = Object.freeze({
    REVELATION: 100,
    CONSTITUTION: 95,
    STATUTE: 90,
    COURT_DECISION: 85,
    REGULATION: 80,
    OFFICIAL_GUIDANCE: 70,
    SCHOLARLY: 60,
    COMMENTARY: 50,
    OPINION: 30,
    USER_GENERATED: 10,
    AI_GENERATED: 0,
    UNKNOWN: 0
});
export function authorityScore(rule = {}) {
    return authorityRank[norm(rule.authorityClass)] ?? Number(rule.authorityRank ?? 0);
}
function effectKey(rule) {
    return JSON.stringify(rule.effect ?? rule.result ?? rule.outcome ?? null);
}
export function detectConflicts(rules = []) {
    const active = rules.filter(Boolean);
    if (active.length <= 1)
        return { status: CONFLICT_STATUS.NONE, conflicts: [] };
    const conflicts = [];
    for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
            const a = active[i], b = active[j];
            const sameScope = (!a.jurisdiction || !b.jurisdiction || a.jurisdiction === b.jurisdiction || a.jurisdiction === 'GLOBAL' || b.jurisdiction === 'GLOBAL');
            const sameKey = !a.key || !b.key || a.key === b.key;
            if (!sameScope || !sameKey)
                continue;
            const different = effectKey(a) !== effectKey(b);
            if (different)
                conflicts.push({ a, b, reason: 'DIFFERENT_EFFECTS' });
        }
    }
    return {
        status: conflicts.length ? CONFLICT_STATUS.ACTUAL : CONFLICT_STATUS.NONE,
        conflicts
    };
}
export function resolveConflicts(rules = [], { jurisdiction = null, asOf = new Date().toISOString() } = {}) {
    const applicable = rules.filter(r => {
        if (jurisdiction && r.jurisdiction && r.jurisdiction !== 'GLOBAL' && r.jurisdiction !== jurisdiction)
            return false;
        const t = Date.parse(asOf);
        const from = r.effectiveFrom ? Date.parse(r.effectiveFrom) : -Infinity;
        const to = r.effectiveTo ? Date.parse(r.effectiveTo) : Infinity;
        return t >= from && t <= to;
    });
    const conflict = detectConflicts(applicable);
    if (!applicable.length)
        return { status: 'NO_APPLICABLE_RULE', selected: null, candidates: [], ...conflict };
    const ranked = [...applicable].sort((a, b) => {
        const ap = Number(a.priority ?? 0), bp = Number(b.priority ?? 0);
        if (bp !== ap)
            return bp - ap;
        return authorityScore(b) - authorityScore(a);
    });
    const selected = ranked[0];
    const unresolved = conflict.conflicts.some(({ a, b }) => authorityScore(a) === authorityScore(b) && Number(a.priority ?? 0) === Number(b.priority ?? 0));
    return {
        ...conflict,
        status: unresolved ? CONFLICT_STATUS.UNRESOLVED : conflict.status,
        selected: unresolved ? null : selected,
        candidates: ranked,
        authorityOrder: ranked.map(r => ({ ruleId: r.ruleId ?? r.key ?? null, authority: authorityScore(r), priority: Number(r.priority ?? 0) }))
    };
}
//# sourceMappingURL=rule-conflict.js.map