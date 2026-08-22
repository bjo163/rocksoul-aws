type Loose = Record<string, any>;
import { id } from '../core/ids.js';
export function caseMemory({ caseId = null, prior = null, analysis = {} }: Loose = {}): Loose {
    const memory = structuredClone(prior && typeof prior === 'object' ? prior : {});
    memory.caseId = caseId ?? memory.caseId ?? id('CASE');
    memory.observations = [...(memory.observations ?? []), { id: id('OBS'), semantic: analysis.semantic ?? null, intent: analysis.intent ?? 'UNRESOLVED' }];
    memory.alternatives = analysis.alternatives ?? [];
    memory.conflicts = analysis.conflicts ?? [];
    memory.timeline = analysis.timeline ?? [];
    memory.evidence = [...(memory.evidence ?? []), ...(analysis.evidence ?? [])];
    memory.updated = new Date().toISOString();
    return memory;
}
//# sourceMappingURL=case-memory.js.map