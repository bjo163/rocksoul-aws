// @ts-nocheck
import { id } from '../core/ids.js';
import { transition } from './eschatology.js';
import { barzakhState } from './barzakh.js';
import { finalGate } from './final-judgment.js';
import { buildAfterlifeVisualization } from './afterlife-visualization.js';
/**
 * Universal one-case lifecycle model.
 * Uses the already-produced semantic/MIZAN record and carries one subject
 * through the modelled lifecycle. It does not compute an unseen divine verdict.
 */
export function createCaseLifecycle({ analysis, person = null } = {}) {
    if (!analysis?.mizan)
        throw new Error('CaseLifecycle requires a completed analysis with MIZAN output.');
    const subject = person ?? { ruhId: id('RUH'), state: 'DUNYA', alive: true };
    const severityScore = Number(analysis.mizan?.assessment?.accountabilityScore ?? analysis.mizan?.xp?.deviationScore ?? 0);
    const positiveScore = Number(analysis.mizan?.assessment?.positiveScore ?? analysis.mizan?.xp?.positiveXp ?? 0);
    const record = {
        lifecycleId: id('LIFE'),
        ruhId: subject.ruhId,
        caseId: analysis.caseId ?? analysis.ledgerId ?? id('CASE'),
        modelOnly: true,
        epistemicBoundary: 'UNSEEN_AND_FINAL_DIVINE_JUDGMENT_OUTSIDE_MODEL',
        phases: [],
        earthly: {
            semantic: analysis.semanticVector ?? analysis.mizan.semantic ?? null,
            mizan: analysis.mizan,
            evidence: analysis.sourceMatches ?? analysis.provenance?.sources ?? [],
            domain: analysis.domainAnalysis?.classification ?? null
        },
        severity: {
            deviationScore: severityScore,
            positiveScore,
            band: severityScore >= 70 ? 'HIGH' : severityScore >= 30 ? 'MEDIUM' : severityScore > 0 ? 'LOW' : 'NONE',
            basis: 'Modelled MIZAN deviation/positive signals; not a divine sin measure.'
        }
    };
    let personState = { ...subject, state: 'DUNYA', alive: true };
    const push = (state, extra = {}) => {
        record.phases.push({ state, ...extra });
    };
    push('DUNYA', { stage: 'WORLD', eventRef: analysis.eventId ?? null });
    const chain = ['DYING', 'DECEASED', 'BARZAKH', 'RESURRECTION', 'MAHSHAR', 'HISAB', 'MIZAN', 'FINAL_STATE'];
    for (const next of chain) {
        personState = transition(personState, next);
        if (next === 'BARZAKH') {
            push(next, { stage: next, stateRecord: barzakhState(personState) });
        }
        else if (next === 'MIZAN') {
            push(next, { stage: next, mizan: analysis.mizan, finalGate: finalGate({ state: next }) });
        }
        else if (next === 'HISAB') {
            push(next, {
                stage: next,
                review: {
                    action: analysis.domainAnalysis?.classification?.action ?? 'UNRESOLVED',
                    intention: analysis.intention ?? analysis.semanticVector?.intention ?? null,
                    impacts: analysis.mizan?.impactVector ?? [],
                    evidenceCount: Array.isArray(record.earthly.evidence) ? record.earthly.evidence.length : 0
                }
            });
        }
        else {
            push(next, { stage: next });
        }
    }
    record.visualization = buildAfterlifeVisualization({ lifecycle: record });
    record.final = {
        state: 'FINAL_STATE',
        destination: 'NOT_DETERMINABLE',
        divineVerdict: 'OUTSIDE_MODEL',
        finalGate: finalGate({ state: 'FINAL_STATE' }),
        reason: 'The software can model lifecycle/accountability states, but it cannot determine an actual unseen divine judgment or final destination.'
    };
    return record;
}
//# sourceMappingURL=case-lifecycle.js.map