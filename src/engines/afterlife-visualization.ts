// @ts-nocheck
const REFS = {
    RECORDING: ['Q50:17-18', 'Q82:10-12'],
    RECORD_BOOK: ['Q17:13', 'Q18:49'],
    BARZAKH: ['Q23:100'],
    BALANCE: ['Q55:7-9', 'Q57:25'],
    CONSEQUENCE: ['Q99:7-8']
};
export function buildAfterlifeVisualization({ lifecycle }) {
    return {
        mode: 'ILLUSTRATIVE_MODEL',
        epistemicBoundary: 'UNSEEN_DOMAIN_NOT_LITERALLY_OBSERVED',
        references: REFS,
        stages: (lifecycle?.phases ?? []).map((phase) => ({
            state: phase.state,
            description: stageDescription(phase.state),
            evidenceRefs: stageRefs(phase.state)
        })),
        warning: 'This visualization presents a modelled lifecycle using referenced concepts; it does not reveal or determine an actual unseen divine judgment.'
    };
}
function stageDescription(state) {
    const map = {
        DUNYA: 'Observed/world-state analysis',
        DYING: 'Modelled transition stage',
        DECEASED: 'Post-death model state',
        BARZAKH: 'Intermediate model state before resurrection',
        RESURRECTION: 'Modelled resurrection stage',
        MAHSHAR: 'Gathering/accountability model stage',
        HISAB: 'Accounting/review model stage',
        MIZAN: 'Balance/weighing model stage',
        FINAL_STATE: 'Terminal model state; actual unseen outcome is not determined'
    };
    return map[state] ?? 'Modelled lifecycle stage';
}
function stageRefs(state) {
    if (state === 'BARZAKH')
        return REFS.BARZAKH;
    if (state === 'HISAB')
        return [...REFS.RECORDING, ...REFS.RECORD_BOOK];
    if (state === 'MIZAN')
        return REFS.BALANCE;
    if (state === 'FINAL_STATE')
        return [...REFS.RECORD_BOOK, ...REFS.CONSEQUENCE];
    return [];
}
//# sourceMappingURL=afterlife-visualization.js.map