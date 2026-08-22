type Loose = Record<string, any>;
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateMizan } from '../engines/mizan.js';
import { normalizeKnowledgeType } from '../knowledge/source-graph.js';
import { buildDecisionProvenance } from '../audit/provenance.js';
import { confidenceScore, confidenceBand } from '../conflict/confidence.js';
import { resolveConflicts } from '../conflict/rule-conflict.js';
import { createCaseLifecycle } from '../engines/case-lifecycle.js';
import { caseMemory } from './case-memory.js';
import { evaluateQuranicMizan } from '../engines/quranic-mizan.js';
import { buildHumanReviewGate } from './human-review-gate.js';
import { fourBookCorroboration } from '../revelation/corroboration/four-book-corroboration.js';
import { revelationAnalyticalScorecard } from '../revelation/revelation-scorecard.js';
const defaultAnalysisRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lower = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFKC');
const clampSigned = (value: unknown) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.min(1, Math.max(-1, n)) : 0;
};
const uniq = (xs: unknown) => [...new Set((Array.isArray(xs) ? xs : []).filter(Boolean))];
function fixedVector(input: unknown, length: number): number[] {
    return Array.from({ length }, (_, i) => clampSigned(Array.isArray(input) ? input[i] : 0));
}
function emptyClaim() {
    return { text: null, referenceCandidates: [], sourceCandidates: [] };
}
export function extractIntent(_text: string, semanticObservation: Loose | null = null) {
    return semanticObservation?.intention?.label ?? semanticObservation?.intent ?? 'UNRESOLVED';
}
export function extractEntities(_text: string, semanticObservation: Loose | null = null): Loose[] {
    return Array.isArray(semanticObservation?.entities) ? semanticObservation.entities : [];
}
export function extractContexts(_text: string, semanticObservation: Loose | null = null): Loose {
    return semanticObservation?.contexts && typeof semanticObservation.contexts === 'object' ? semanticObservation.contexts : {};
}
export function extractClaim(text: string, semanticObservation: Loose | null = null): Loose {
    const claim = semanticObservation?.claim;
    if (claim && typeof claim === 'object') {
        return {
            text: claim.text ?? null,
            referenceCandidates: uniq(claim.referenceCandidates),
            sourceCandidates: uniq(claim.sourceCandidates)
        };
    }
    const raw = String(text ?? '');
    const quoted = raw.match(/[\"“”](.*?)[\"“”]/);
    return {
        text: quoted?.[1] ?? null,
        referenceCandidates: [...raw.matchAll(/\b(?:Q\s*)?\d{1,3}:\d{1,3}\b/g)].map(m => m[0].replace(/^Q\s*/i, '')),
        sourceCandidates: []
    };
}
export function inferCandidateAction(_text: string, semanticObservation: Loose | null = null): Loose[] {
    if (!semanticObservation)
        return [];
    const action = semanticObservation.action ?? semanticObservation.action?.label;
    return action ? [{ action, hits: [], source: 'SEMANTIC_PROVIDER' }] : [];
}
function normalizeSemanticObservation(observation: Loose = {}): Loose {
    const rgbl = observation.intention?.rgbl ?? observation.rgbl ?? observation.semantic?.vector ?? observation.vector ?? { R: 0, G: 0, B: 0, L: 0 };
    const semantic = { R: clampSigned(rgbl.R), G: clampSigned(rgbl.G), B: clampSigned(rgbl.B), L: clampSigned(rgbl.L) };
    const actionGateVector = fixedVector(observation.actionGateVector ?? observation.gates, 9);
    const impactVector = fixedVector(observation.impactVector ?? observation.impacts, 13);
    const intention = observation.intention ?? {};
    const timeFactor = observation.timeFactor ?? observation.time ?? {};
    const causality = observation.causality ?? {};
    const domainVector = observation.domainVector ?? observation.domain?.vector ?? {};
    const evidence = Array.isArray(observation.evidence) ? observation.evidence : (Array.isArray(observation.evidence_refs) ? observation.evidence_refs : []);
    const alternatives = Array.isArray(observation.alternatives) ? observation.alternatives : [];
    const conflicts = Array.isArray(observation.conflicts) ? observation.conflicts : [];
    const timeline = Array.isArray(observation.timeline) ? observation.timeline : [];
    return {
        semantic,
        actionGateVector,
        impactVector,
        timeFactor,
        causality,
        domainVector,
        intention,
        intent: intention.label ?? observation.intent ?? 'UNRESOLVED',
        status: observation.status ?? 'INFERRED',
        confidence: Number(observation.confidence ?? intention.confidence ?? 0),
        evidence,
        alternatives,
        conflicts,
        timeline,
        entities: Array.isArray(observation.entities) ? observation.entities : [],
        contexts: observation.contexts ?? {},
        claim: observation.claim ?? emptyClaim(),
        caseId: observation.caseId ?? null,
        eventId: observation.eventId ?? null,
        ledgerId: observation.ledgerId ?? null,
        caseMemory: observation.caseMemory ?? null,
        sourceNotes: observation.sourceNotes ?? [],
        quranGrounding: observation.quranGrounding ?? { coverage: 'NONE', direct: [], principles: [] },
        epistemicSignals: observation.epistemicSignals ?? {},
        sourcePolicy: observation.sourcePolicy ?? null,
        legacyBridge: observation.legacyBridge ?? null,
        revelationBinding: observation.revelationBinding ?? null,
        revelationSignals: observation.revelationSignals ?? null,
        eventGraph: observation.eventGraph ?? null,
        eventInterpretation: observation.eventInterpretation ?? null,
        moralLifecycle: observation.moralLifecycle ?? null
    };
}
function reconstructTimeline(observed: Loose): Loose[] {
    if (observed.timeline.length)
        return observed.timeline;
    const time = observed.timeFactor ?? {};
    if (!time || Object.keys(time).length === 0)
        return [];
    return [{
            sequence: time.sequence ?? 0,
            timestamp: time.timestamp ?? null,
            window: time.time_window ?? time.timeWindow ?? null,
            phase: time.day_phase ?? time.phase ?? null,
            duration: time.duration ?? null,
            relation: time.context_time ?? time.contextTime ?? null,
            status: time.status ?? 'INFERRED'
        }];
}
function assessAlternatives(observed: Loose): Loose[] {
    return observed.alternatives.map((candidate: Loose, index: number) => ({
        id: candidate.id ?? `ALT_${index + 1}`,
        label: candidate.label ?? candidate.action ?? candidate.intent ?? 'UNSPECIFIED',
        probability: Number(candidate.probability ?? candidate.confidence ?? 0),
        status: candidate.status ?? 'INFERRED',
        evidence_refs: candidate.evidence_refs ?? candidate.evidenceRefs ?? []
    })).sort((a: Loose, b: Loose) => b.probability - a.probability);
}
function assessConflicts(observed: Loose): Loose[] {
    return observed.conflicts.map((conflict: Loose, index: number) => ({
        id: conflict.id ?? `CONFLICT_${index + 1}`,
        type: conflict.type ?? 'SEMANTIC',
        sides: conflict.sides ?? conflict.claims ?? [],
        severity: Number(conflict.severity ?? conflict.confidence ?? 0.5),
        status: conflict.status ?? 'UNRESOLVED',
        evidence_refs: conflict.evidence_refs ?? conflict.evidenceRefs ?? []
    }));
}
function buildMizanTrace(mizan: Loose | null, observed: Loose, sourceMatches: Loose[]): Loose {
    return {
        formula: 'Revelation-grounded RGBL/OUT assessment',
        inputs: {
            rgbl: mizan?.semantic ?? observed.semantic,
            actionGate: mizan?.actionGateVector ?? observed.actionGateVector,
            impact: mizan?.impactVector ?? observed.impactVector,
            time: observed.timeFactor,
            causality: observed.causality,
            domain: observed.domainVector,
            evidenceCount: sourceMatches.length + observed.evidence.length,
            moralLifecycle: observed.moralLifecycle ?? null
        },
        stages: [
            { stage: 'SEMANTIC', value: mizan?.semantic ?? observed.semantic },
            { stage: 'GATE', value: mizan?.actionGateVector ?? observed.actionGateVector },
            { stage: 'IMPACT', value: mizan?.impactVector ?? observed.impactVector },
            { stage: 'TIME', value: observed.timeFactor },
            { stage: 'CAUSALITY', value: observed.causality },
            { stage: 'EVIDENCE', value: { sourceMatches: sourceMatches.length, explicit: observed.evidence.length } },
            { stage: 'MORAL_LIFECYCLE', value: observed.moralLifecycle ?? null },
            { stage: 'ASSESSMENT', value: mizan?.assessment ?? null }
        ],
        epistemic: 'ENGINE_DERIVED_TRACE'
    };
}
export function buildAiAnalysis(text: string, { sourceGraph = null, jurisdiction = 'ID', semanticVector = null, scale = null, semanticObservation = null, persistedEvidence = [], root = defaultAnalysisRoot }: Loose = {}): Loose {
    const observed = normalizeSemanticObservation({
        ...(semanticObservation ?? {}),
        evidence: [
            ...(Array.isArray(semanticObservation?.evidence) ? semanticObservation.evidence : []),
            ...(Array.isArray(persistedEvidence) ? persistedEvidence : [])
        ]
    });
    const intent = semanticObservation ? observed.intent : 'UNRESOLVED';
    const entities = extractEntities(text, semanticObservation);
    const contexts = extractContexts(text, semanticObservation);
    const claim = extractClaim(text, semanticObservation);
    const candidateActions = inferCandidateAction(text, semanticObservation);
    const domainAnalysis = semanticObservation ? {
        query: text,
        matched: true,
        recognizedRule: 'SEMANTIC_OBSERVATION',
        classification: { action: semanticObservation.action ?? 'SEMANTIC_ACTION', category: 'SEMANTIC', semanticMode: semanticObservation.mode ?? 'REFLECTION' },
        legal: { status: 'UNASSESSED', confidence: 0, sourceProfiles: [], contextFindings: {} },
        semantic: { vector: observed.semantic, semanticVector: semanticVector ?? null },
        rights: [], wealth: {}, harm: {}
    } : {
        query: text,
        matched: false,
        recognizedRule: null,
        classification: { action: null, category: 'UNRESOLVED', semanticMode: 'UNKNOWN' },
        legal: { status: 'UNASSESSED', confidence: 0, sourceProfiles: [], contextFindings: {} },
        semantic: { vector: { R: 0, G: 0, B: 0, L: 0 }, semanticVector: null },
        rights: [], wealth: {}, harm: {}
    };
    let sourceMatches: Loose[] = [];
    if (sourceGraph) {
        if (claim.text)
            sourceMatches = sourceGraph.search({ q: claim.text, limit: 10 }) ?? [];
        if (!sourceMatches.length && claim.referenceCandidates?.length) {
            for (const ref of claim.referenceCandidates) {
                const matches = sourceGraph.search({ reference: ref.replace(/^Q\s*/i, ''), limit: 10 }) ?? [];
                sourceMatches.push(...matches);
            }
        }
        if (!sourceMatches.length && claim.sourceCandidates?.length) {
            for (const src of claim.sourceCandidates) {
                const type = normalizeKnowledgeType(src);
                sourceMatches.push(...(sourceGraph.search({ type, q: '', limit: 10 }) ?? []));
            }
        }
        sourceMatches = [...new Map(sourceMatches.map((x: Loose) => [x.knowledgeId ?? x.id, x] as const)).values()];
    }
    const timeline = reconstructTimeline(observed);
    const alternatives = assessAlternatives(observed);
    const conflicts = assessConflicts(observed);
    const semanticVectorData = semanticVector ?? null;
    const scaleProfile = scale ?? semanticObservation?.scale ?? {};
    const candidateRules: Loose[] = [];
    const ruleResolution = resolveConflicts(candidateRules as any, { jurisdiction, asOf: new Date().toISOString() } as any);
    const evidenceConfidence = observed.evidence.length || sourceMatches.length ? Math.min(1, 0.55 + Math.min(sourceMatches.length + observed.evidence.length, 5) * 0.08) : 0.25;
    const semanticConfidence = semanticObservation ? Math.max(0, Math.min(1, observed.confidence || 0)) : 0;
    const contextConfidence = Object.keys(contexts).length ? 0.6 : 0.4;
    const authorityConfidence = sourceMatches.length ? Math.max(...sourceMatches.map((x: Loose) => x.authorityClass === 'REVELATION' ? 1 : x.authorityClass === 'STATUTE' ? 0.9 : 0.65)) : 0.3;
    const evidenceQuality = evidenceConfidence;
    const confidence = confidenceScore({
        evidence: evidenceConfidence,
        rule: 0.3,
        semantic: semanticConfidence,
        context: contextConfidence,
        sourceAuthority: authorityConfidence,
        conflictPenalty: conflicts.some(c => c.status === 'ACTUAL_CONFLICT') ? 0.5 : conflicts.length ? 1 : 0
    });
    const mizan = semanticObservation ? evaluateMizan({
        semantic: observed.semantic,
        semanticVector: semanticVectorData ?? {},
        actionGateVector: observed.actionGateVector,
        impactVector: observed.impactVector,
        timeFactor: observed.timeFactor,
        causality: observed.causality,
        domainVector: observed.domainVector,
        semanticObservation: observed,
        scale: scaleProfile,
        evidenceCount: sourceMatches.length + observed.evidence.length,
        confidence,
        evidenceQuality,
        uncertainty: 1 - confidence,
        factors: {
            mode: semanticObservation.mode ?? 'REFLECTION',
            impact: observed.impactVector.reduce((a: number, b: number) => a + Math.abs(b), 0) / 13,
            evidence: observed.evidence.length || sourceMatches.length ? 1 : 0.5,
            responsibility: observed.eventInterpretation?.composite?.violationResponsibilityFactor ?? observed.epistemicSignals?.responsibilityFactor ?? undefined
        }
    }) : null;
    const quranicMizan = semanticObservation ? evaluateQuranicMizan({ text, observed, mizan, conflicts, eventInterpretation: observed.eventInterpretation }) : null;
    const fourBook = semanticObservation ? fourBookCorroboration({
        text, action: semanticObservation.action ?? observed.intent ?? '',
        quranRefs: quranicMizan?.quranGrounding?.refs ?? [], queryPhrases: observed.revelationBinding?.witnessQueryPhrases ?? [], root
    }) : null;
    const revelationScorecard = semanticObservation ? revelationAnalyticalScorecard({ observed, mizan, quranicMizan, fourBook, binding: observed.revelationBinding, root }) : null;
    const reviewGate = buildHumanReviewGate({ observed, quranicMizan, scorecard: revelationScorecard, conflicts });
    const provenance = buildDecisionProvenance({
        sources: sourceMatches as any,
        claims: claim.text ? [{ claimId: `CLAIM_${claim.referenceCandidates?.[0] ?? 'TEXT'}`, confidence }] : [],
        rules: (ruleResolution.candidates ?? []) as any,
        model: { id: 'moonwitness-semantic-core', version: '4.32.0', confidence: semanticConfidence, provenance: observed.sourceNotes ?? [] } as any
    } as any) as Loose;
    const baseResult = {
        text,
        intent,
        entities,
        contexts,
        claim,
        candidateActions,
        alternatives,
        conflicts,
        timeline,
        sourceMatches,
        domainAnalysis,
        semanticVector: semanticObservation ? observed : semanticVectorData,
        intention: observed.intention,
        scale: scaleProfile,
        mizan: mizan ? {
            ...mizan,
            quranic: quranicMizan,
            trace: buildMizanTrace(mizan, observed, sourceMatches)
        } : null,
        quranicMizan,
        fourBookCorroboration: fourBook,
        revelationBinding: observed.revelationBinding ?? null,
        eventGraph: observed.eventGraph ?? null,
        eventInterpretation: observed.eventInterpretation ?? null,
        moralLifecycle: observed.moralLifecycle ?? null,
        revelationScorecard,
        reviewGate,
        revelationPolicy: observed.sourcePolicy ?? { mode: 'FOUR_BOOKS_ONLY', normativeBooks: ['QURAN','TAWRAT','ZABUR','INJIL'], externalNormativeWeight: 0 },
        legacySemanticBridge: observed.legacyBridge ?? null,
        ruleResolution,
        confidence: { score: confidence, band: confidenceBand(confidence), semantic: semanticConfidence, evidenceQuality, uncertainty: 1 - confidence },
        provenance,
        caseId: observed.caseId ?? null,
        eventId: observed.eventId ?? null,
        ledgerId: observed.ledgerId ?? null,
        caseMemory: semanticObservation ? caseMemory({
            caseId: observed.caseId,
            prior: observed.caseMemory,
            analysis: { intent, entities, alternatives, conflicts, timeline, semantic: observed.semantic, evidence: [...observed.evidence, ...sourceMatches] }
        }) : null,
        capability: {
            sourceGrounded: sourceMatches.length > 0 || observed.evidence.length > 0,
            ruleGrounded: false,
            modelOnly: true,
            semanticEngine: 'moonwitness-moral-lifecycle+event-graph+native-revelation-binding+revelation-grounded-rgbl-out+four-book-core',
            needsHumanReview: Boolean(reviewGate?.requiresHumanReview)
        }
    };
    return {
        ...baseResult,
        lifecycle: mizan ? createCaseLifecycle({ analysis: baseResult } as any) : null
    };
}
export async function analyzeWithProvider(text: string, { provider, ...options }: Loose = {}): Promise<Loose> {
    if (!provider || typeof provider.analyze !== 'function')
        throw new Error('A semantic AI provider is required.');
    const semanticObservation = await provider.analyze(text, options);
    return buildAiAnalysis(text, { ...options, semanticObservation });
}
//# sourceMappingURL=general-analyzer.js.map
export async function analyzeAutomatically(text: string, options: Loose = {}): Promise<Loose> {
  const { createDefaultSemanticProvider } = await import('./provider.js');
  const provider = options.provider ?? createDefaultSemanticProvider(options.root ?? process.cwd());
  return analyzeWithProvider(text, { ...options, provider });
}
