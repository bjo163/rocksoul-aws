// @ts-nocheck
export function finalDestination({ state } = {}) { if (state !== 'FINAL_STATE')
    return 'NOT_DETERMINABLE'; return 'MODEL_ONLY_FINAL_STATE'; }
export function finalGate({ state }) { return { passed: state === 'FINAL_STATE', absoluteDivineVerdict: false, modelOnly: true }; }
//# sourceMappingURL=final-judgment.js.map