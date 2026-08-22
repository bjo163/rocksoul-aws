import { runtimeDatasetOr } from '../persistence/runtime-data.js';
type Loose = Record<string, any>;
type NumberMap = Record<string, number>;
const clamp = (v: unknown, min = 0, max = 1): number => Math.min(max, Math.max(min, Number(v ?? 0)));
export function severityBand(raw: number): number { return raw >= 70 ? 70 : raw >= 30 ? 30 : raw >= 12 ? 12 : 4; }
const normalizedScale: Record<string, Record<string, number>> = {
    scope: { SELF: 0.2, FAMILY: 0.35, HOUSEHOLD: 0.4, FRIENDS: 0.45, COMMUNITY: 0.6, CITY: 0.7, REGION: 0.8, NATION: 0.9, MULTI_NATION: 0.95, GLOBAL: 1.0, ENVIRONMENT: 0.9, NON_HUMAN_LIFE: 0.8, FUTURE_GENERATION: 1.0, SYSTEM: 0.95 },
    reach: { R1: 0.1, R2: 0.2, R3: 0.3, R4: 0.4, R5: 0.5, R6: 0.65, R7: 0.8, R8: 0.9, R9: 0.95, R10: 1.0 },
    depth: { D1: 0.1, D2: 0.25, D3: 0.4, D4: 0.55, D5: 0.7, D6: 0.85, D7: 1.0 },
    duration: { MOMENTARY: 0.1, SHORT: 0.25, MEDIUM: 0.45, LONG: 0.65, PERSISTENT: 0.8, INTERGENERATIONAL: 1.0 },
    reversibility: { FULLY_REVERSIBLE: 0.1, MOSTLY_REVERSIBLE: 0.25, PARTIALLY_REVERSIBLE: 0.5, HARD_TO_REVERSE: 0.75, IRREVERSIBLE: 1.0 },
    power: { PERSONAL: 0.2, HOUSEHOLD: 0.3, TEAM: 0.4, ORGANIZATION: 0.55, LOCAL_OFFICIAL: 0.65, REGIONAL_OFFICIAL: 0.75, NATIONAL_OFFICIAL: 0.9, GLOBAL_INSTITUTION: 1.0 },
    exposure: { NONE: 0.05, LIMITED: 0.2, LOCAL: 0.35, REGIONAL: 0.55, NATIONAL: 0.75, GLOBAL: 1.0, PERSISTENT_PUBLIC: 1.0 },
    systemicity: { INDIVIDUAL: 0.2, GROUP: 0.35, INSTITUTION: 0.55, SECTOR: 0.7, NATIONAL_SYSTEM: 0.9, GLOBAL_SYSTEM: 1.0 },
    environment: { NONE: 0.0, PERSONAL_ENVIRONMENT: 0.2, LOCAL_ECOSYSTEM: 0.4, REGIONAL_ECOSYSTEM: 0.6, NATIONAL_ENVIRONMENT: 0.75, GLOBAL_ENVIRONMENT: 1.0, BIODIVERSITY: 0.9, CLIMATE: 1.0 },
    futureImpact: { NONE: 0.05, LOW: 0.2, MEDIUM: 0.45, HIGH: 0.75, INTERGENERATIONAL: 1.0 },
    evidence: { NONE: 0.0, LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, VERIFIED: 1.0 },
    dignity: { NONE: 0.0, LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, SEVERE: 1.0 },
    socialImpact: { NONE: 0.0, LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, SEVERE: 1.0 },
    irreversibility: { NONE: 0.0, LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, IRREVERSIBLE: 1.0 },
    risk: { NONE: 0.0, LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, CRITICAL: 1.0 },
    quality: { NONE: 0.0, LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, EXCELLENT: 1.0 },
    intent: { HARMFUL: 0.0, UNKNOWN: 0.5, NEUTRAL: 0.6, GOOD: 0.85, EXEMPLARY: 1.0 },
    repair: { NONE: 0.0, PARTIAL: 0.5, COMPLETE: 1.0 }
};
export function normalizeScale(scale: Loose = {}): NumberMap {
    const out: NumberMap = {};
    for (const [key, map] of Object.entries(normalizedScale)) {
        if (typeof scale[key] === 'number')
            out[key] = clamp(scale[key]);
        else if (scale[key] == null || scale[key] === '' || scale[key] === 'UNKNOWN')
            out[key] = 0.5;
        else
            out[key] = map[scale[key]] ?? 0.5;
    }
    for (const key of ['context', 'responsibility', 'consistency', 'base', 'mode']) {
        if (typeof scale[key] === 'number')
            out[key] = scale[key];
    }
    return out;
}
export function calculateScaleFactor(scale: Loose = {}): number {
    const s = normalizeScale(scale);
    const keys = ['scope', 'reach', 'depth', 'duration', 'reversibility', 'power', 'exposure', 'systemicity', 'environment', 'futureImpact', 'evidence', 'dignity', 'socialImpact', 'irreversibility', 'risk'];
    const values = keys.map((k: string) => clamp(s[k] ?? 0.5));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Number((0.5 + avg).toFixed(6));
}
export function calculateSemanticScaleAffinity(semanticVector: Loose = {}): number {
    const attrs: Loose[] = Array.isArray(semanticVector?.attributes) ? semanticVector.attributes as Loose[] : [];
    if (!attrs.length)
        return 0.5;
    let weighted = 0;
    let total = 0;
    for (const attr of attrs) {
        const w = Number(attr.weight ?? 0);
        const biases = Object.values(attr.scaleBias ?? {}).map(Number).filter(Number.isFinite);
        const b = biases.length ? biases.reduce((a, x) => a + x, 0) / biases.length : 0.5;
        weighted += Math.min(1, Math.max(0, b)) * w;
        total += w;
    }
    return total ? Number(Math.min(1, Math.max(0, weighted / total)).toFixed(6)) : 0.5;
}
export function calculateEssenceFactor(semanticVector: Loose = {}): number {
    const weights = semanticVector?.weights ?? {};
    const vals = Object.values(weights).map(Number).filter(Number.isFinite);
    if (!vals.length)
        return 0;
    const primary = Array.isArray(semanticVector.primary) ? semanticVector.primary : [];
    const primaryVals = primary.map((id: number|string) => Number(weights[id] ?? 0)).filter(Number.isFinite);
    const secondaryVals = Object.entries(weights).filter(([id]) => !primary.includes(Number(id))).map(([, v]) => Number(v)).filter(Number.isFinite);
    const primaryMean = primaryVals.length ? primaryVals.reduce((a, b) => a + b, 0) / primaryVals.length : 0;
    const secondaryMean = secondaryVals.length ? secondaryVals.reduce((a, b) => a + b, 0) / secondaryVals.length : 0;
    return Number(Math.min(1, primaryMean * 0.7 + secondaryMean * 0.3).toFixed(6));
}
export function calculateXp({ baseXp = 100, semanticVector = {}, scale = {}, factors = {}, mode = semanticVector?.mode ?? 'REFLECTION' }: Loose = {}): Loose {
    const s = normalizeScale(scale);
    const essence = calculateEssenceFactor(semanticVector);
    const scaleFactor = calculateScaleFactor(scale);
    const semanticScaleAffinity = calculateSemanticScaleAffinity(semanticVector);
    const intent = clamp(factors.intent ?? s.intent ?? 0.7);
    const quality = clamp(factors.quality ?? s.quality ?? 0.7);
    const context = clamp(factors.context ?? s.context ?? 0.7);
    const consistency = clamp(factors.consistency ?? s.consistency ?? 0.5);
    const repair = clamp(factors.repair ?? s.repair ?? 0.0);
    const impact = clamp(factors.impact ?? s.socialImpact ?? s.systemicity ?? 0.5);
    const evidence = clamp(factors.evidence ?? s.evidence ?? 0.5);
    const dignity = clamp(factors.dignity ?? s.dignity ?? 0.5);
    const futureImpact = clamp(factors.futureImpact ?? s.futureImpact ?? 0.5);
    const semanticScaleMultiplier = 0.9 + semanticScaleAffinity * 0.1;
    const positiveMultiplier = (0.75 + impact * 0.25) * (0.8 + evidence * 0.2) * (0.9 + dignity * 0.1) * (0.9 + futureImpact * 0.1) * semanticScaleMultiplier;
    const consistencyMultiplier = 0.9 + consistency * 0.1;
    const contextMultiplier = 0.9 + context * 0.1;
    const positive = mode === 'DEVIATION' ? 0 : baseXp * essence * scaleFactor * intent * quality * positiveMultiplier * consistencyMultiplier * contextMultiplier;
    const deviation = mode === 'DEVIATION' ? baseXp * Math.max(0.15, essence) * scaleFactor * (0.9 + impact * 0.1) * (1.0 + Math.max(0, 1 - quality) * 0.2) * (0.9 + futureImpact * 0.1) * semanticScaleMultiplier : 0;
    const repairScore = mode === 'DEVIATION' ? baseXp * repair * 0.25 : baseXp * repair * 0.1;
    return { positiveXp: Math.round(positive), deviationScore: Math.round(deviation), repairScore: Math.round(repairScore), totalXp: Math.round(positive - deviation + repairScore), essenceFactor: essence, scaleFactor, normalizedScale: s, modelOnly: true };
}
function normalizeFixedVector(value: unknown, length: number): number[] {
    const arr = Array.isArray(value) ? value : [];
    return Array.from({ length }, (_, i) => {
        const n = Number(arr[i] ?? 0);
        return Number.isFinite(n) ? Math.min(1, Math.max(-1, n)) : 0;
    });
}

function normalizeEvidenceVector(value: unknown, length: number): number[] {
    const arr = Array.isArray(value) ? value : [];
    return Array.from({ length }, (_, i) => {
        const n = Number(arr[i] ?? 0);
        return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
    });
}
function meanAbs(arr: number[] = []): number {
    return arr.length ? arr.reduce((s, x) => s + Math.abs(Number(x || 0)), 0) / arr.length : 0;
}
function meanNegative(arr: number[] = []): number {
    if (!arr.length)
        return 0;
    return arr.reduce((s, x) => s + Math.max(0, -Number(x || 0)), 0) / arr.length;
}
function meanPositive(arr: number[] = []): number {
    if (!arr.length)
        return 0;
    return arr.reduce((s, x) => s + Math.max(0, Number(x || 0)), 0) / arr.length;
}
function scalar(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
}
function buildPerspectives(semantic: Loose = { R: 0, G: 0, B: 0, L: 0 }, semanticObservation: Loose = {}): Loose {
    const chain = semanticObservation?.intention?.chain ?? semanticObservation?.rgbl?.chain ?? null;
    const axis = (name: string, value: unknown, parentAxes: string[] = []): Loose => ({
        axis: name,
        value: Number(value ?? 0),
        status: chain?.find?.((x: Loose) => x.axis === name)?.status ?? 'INFERRED',
        confidence: Number(chain?.find?.((x: Loose) => x.axis === name)?.confidence ?? semanticObservation?.intention?.confidence ?? 0),
        evidence_refs: chain?.find?.((x: Loose) => x.axis === name)?.evidence_refs ?? [],
        derives_from: parentAxes
    });
    return {
        R: axis('R', semantic.R, []),
        G: axis('G', semantic.G, ['R']),
        B: axis('B', semantic.B, ['R', 'G']),
        L: axis('L', semantic.L, ['R', 'G', 'B'])
    };
}
function computeUnifiedAssessment({ semantic, gates, impact, timeFactor, causality, domainVector, evidenceCount, confidence, evidenceQuality = 0.25 }: Loose): Loose {
    // RGBL roles are intentionally asymmetric in v4.26:
    // R = violation/harm direction, G = constructive alignment/benefit,
    // B = epistemic/grounding strength (never a moral bonus), L = restoration/repair.
    const scoring=(runtimeDatasetOr('data/revelation/scoring-profile.json',{}) as Loose)?.mizan??{};
    const redRisk = Math.max(0, -Number(semantic?.R ?? 0));
    const greenBenefit = Math.max(0, Number(semantic?.G ?? 0));
    const lightRestoration = Math.max(0, Number(semantic?.L ?? 0));
    const blueGrounding = scalar(semantic?.B ?? 0);
    const semanticRisk = redRisk * Number(scoring.redRiskWeight??0.55);
    const gateEvidence = gates.length ? gates.reduce((a: number, b: number) => a + Math.max(0, Number(b || 0)), 0) / gates.length : 0;
    const impactRisk = meanNegative(impact) * Number(scoring.negativeImpactWeight??0.45);
    // Causality, duration/intensity and domain breadth describe real-world analytical magnitude only.
    // They cannot create moral direction; they may scale a Revelation-grounded direction modestly.
    const causalMagnitude = scalar(causality?.causal_strength ?? causality?.strength ?? 0);
    const timeMagnitude = scalar(timeFactor?.intensity ?? 0);
    const domainBreadth = Math.min(1, Object.values(domainVector ?? {}).map(Number).filter(Number.isFinite).reduce((a, b) => a + Math.abs(b), 0));
    const magnitudeMultiplier = 1 + causalMagnitude * Number(scoring.causalMagnitude??0.10) + timeMagnitude * Number(scoring.timeMagnitude??0.08) + domainBreadth * Number(scoring.domainBreadth??0.07);
    const externalConfidence = scalar(confidence, 0.25);
    const epistemicConfidence = Math.min(1, blueGrounding > 0 ? blueGrounding * Number(scoring.blueGroundingWeight??0.65) + externalConfidence * Number(scoring.externalConfidenceWeight??0.35) : externalConfidence);
    const uncertainty = 1 - epistemicConfidence;
    const risk = Math.min(1, (semanticRisk + impactRisk) * magnitudeMultiplier);
    const positiveBase = greenBenefit * Number(scoring.greenBenefitWeight??0.55) + lightRestoration * Number(scoring.lightRestorationWeight??0.15) + meanPositive(impact) * Number(scoring.positiveImpactWeight??0.30);
    const positive = Math.min(1, positiveBase * magnitudeMultiplier);
    const accountabilityScore = Math.round(risk * 100);
    const positiveScore = Math.round(positive * 100);
    const band = accountabilityScore >= 70 ? 'HIGH' : accountabilityScore >= 40 ? 'MEDIUM' : accountabilityScore >= 15 ? 'LOW' : 'MINIMAL';
    return { risk, accountabilityScore, positiveScore, band, confidence: epistemicConfidence, evidenceQuality: scalar(evidenceQuality, 0.25), uncertainty, evidenceSignal: scalar(evidenceQuality, 0.25), gateEvidence, rgblRoles:{redRisk,greenBenefit,blueGrounding,lightRestoration} };
}
export function evaluateMizan({ semantic = { R: 0, G: 0, B: 0, L: 0 }, semanticVector = {}, factors = {}, scale = {}, actionGateVector = [], impactVector = [], timeFactor = {}, causality = {}, domainVector = {}, semanticObservation = {}, evidenceCount = 0, confidence = semanticObservation?.confidence ?? 0, evidenceQuality = 0.25 }: Loose = {}): Loose {
    const normalizedGates = normalizeEvidenceVector(actionGateVector, 9);
    const normalizedImpact = normalizeFixedVector(impactVector, 13);
    const scaleFactor = calculateScaleFactor(scale);
    const semanticScaleAffinity = calculateSemanticScaleAffinity(semanticVector);
    const rs = semanticObservation?.epistemicSignals ?? {};
    const responsibility = scalar(factors.responsibility ?? ((rs.coercion ? 0.55 : 1) * (rs.mistake ? 0.60 : 1) * (rs.capacityLimited ? 0.75 : 1)), 1);
    const unified = computeUnifiedAssessment({
        semantic,
        gates: normalizedGates,
        impact: normalizedImpact,
        timeFactor,
        causality,
        domainVector,
        evidenceCount,
        confidence,
        evidenceQuality
    });
    const responsibilityAdjusted = Math.round(unified.accountabilityScore * responsibility);
    const normalizedScore = Number((responsibilityAdjusted * scaleFactor).toFixed(4));
    const xp = calculateXp({ semanticVector, scale, factors, mode: factors.mode ?? semanticVector?.mode ?? 'REFLECTION' });
    const unifiedDeviation = responsibilityAdjusted;
    const unifiedPositive = unified.positiveScore;
    return {
        raw: unified.accountabilityScore,
        band: unified.band,
        score: normalizedScore,
        semantic,
        perspectives: buildPerspectives(semantic, semanticObservation),
        semanticVector,
        actionGateVector: normalizedGates,
        impactVector: normalizedImpact,
        timeFactor,
        causality,
        domainVector,
        scale: xp.normalizedScale,
        scaleFactor,
        semanticScaleAffinity,
        assessment: {
            unified: true,
            accountabilityScore: unifiedDeviation,
            positiveScore: unifiedPositive,
            risk: unified.risk,
            responsibilityFactor: responsibility,
            unadjustedAccountabilityScore: unified.accountabilityScore,
            evidenceSignal: unified.evidenceSignal,
            confidence: unified.confidence,
            evidenceQuality: unified.evidenceQuality,
            uncertainty: unified.uncertainty,
            rgblRoles: unified.rgblRoles,
            basis: 'Revelation-grounded RGBL/OUT analytical assessment. R and G carry direction, B is epistemic grounding only, and L is restoration. Time/causality/domain may scale magnitude but cannot create moral direction. Numeric values are software measurements, not revealed sin/reward units or a divine verdict.'
        },
        xp: {
            ...xp,
            deviationScore: unifiedDeviation,
            positiveXp: unifiedPositive,
            totalXp: unifiedPositive - unifiedDeviation
        },
        trace: {
            formula: 'Revelation-grounded RGBL/OUT assessment',
            stages: [
                { stage: 'RGBL', value: semantic },
                { stage: 'ACTION_GATE', value: normalizedGates },
                { stage: 'IMPACT', value: normalizedImpact },
                { stage: 'TIME', value: timeFactor },
                { stage: 'CAUSALITY', value: causality },
                { stage: 'DOMAIN', value: domainVector },
                { stage: 'EVIDENCE', value: { count: evidenceCount, confidence, quality: evidenceQuality, uncertainty: unified.uncertainty } },
                { stage: 'ASSESSMENT', value: unified }
            ],
            epistemic: 'ENGINE_DERIVED_TRACE'
        },
        modelOnly: true
    };
}
//# sourceMappingURL=mizan.js.map