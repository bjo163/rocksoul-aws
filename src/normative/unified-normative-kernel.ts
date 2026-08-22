// @ts-nocheck
import { createHash, randomUUID } from 'node:crypto';

export const PERSPECTIVES = Object.freeze({
  R: { id:'R', name:'REALITY', question:'Apa yang benar-benar terjadi?', purpose:'Facts, evidence, observable state.' },
  G: { id:'G', name:'GUIDANCE', question:'Norma/petunjuk apa yang relevan?', purpose:'Revelation, law, ethics, policy and guidance.' },
  B: { id:'B', name:'BALANCE', question:'Bagaimana hak, kewajiban, hukum, dan distribusi ditempatkan adil?', purpose:'Justice, rights, duties, burden and accountability.' },
  L: { id:'L', name:'LIGHT', question:'Bagaimana keadaan diperbaiki dan dimanfaatkan untuk kebaikan?', purpose:'Remedy, protection, restoration, welfare and beneficial outcomes.' }
});

const normalize = (value) => String(value ?? '').trim();

export function createNormativeEvent(input = {}) {
  const eventId = input.eventId ?? `EVT_${randomUUID()}`;
  return {
    eventId,
    type: normalize(input.type || input.eventType || 'UNKNOWN'),
    actor: input.actor ?? null,
    subject: input.subject ?? null,
    place: input.place ?? null,
    jurisdiction: input.jurisdiction ?? null,
    asOf: input.asOf ?? new Date().toISOString(),
    context: input.context ?? {},
    evidence: input.evidence ?? [],
    sources: input.sources ?? [],
    metadata: input.metadata ?? {}
  };
}

export function sourceLens(source = {}) {
  return {
    sourceId: source.sourceId ?? `SRC_${randomUUID()}`,
    authorityClass: source.authorityClass ?? 'UNKNOWN',
    domain: source.domain ?? 'UNSPECIFIED',
    citation: source.citation ?? null,
    perspective: source.perspective ?? null,
    priority: Number(source.priority ?? 0),
    confidence: Math.max(0, Math.min(1, Number(source.confidence ?? 0)))
  };
}

export function buildPerspectiveProfile({ event, sources = [], asma = null, rights = [], harms = [], remedies = [] } = {}) {
  const truth = { event: !!event, evidenceCount: event?.evidence?.length ?? 0, sourceCount: sources.length };
  const guidance = { sources: sources.filter(s => ['REVELATION','RELIGIOUS_TRADITION','CONSTITUTION','STATUTE','REGULATION','POLICY','ETHICAL'].includes(s.authorityClass)) };
  const balance = { rights, harms, remedyCount: remedies.length, primaryAsma: asma?.primary?.name ?? null };
  const light = { remedies, restorative: remedies.some(r => /REPAIR|RESTORE|PROTECT|WELFARE/i.test(String(r.type ?? r))) };
  return { R:truth, G:guidance, B:balance, L:light };
}

export function classifyNormative(event, { sources = [], rules = [], asma = null, rights = [], harms = [], remedies = [] } = {}) {
  const normalizedEvent = createNormativeEvent(event);
  const matchedRules = rules
    .filter(rule => !rule.jurisdiction || rule.jurisdiction === normalizedEvent.jurisdiction)
    .filter(rule => !rule.type || rule.type === normalizedEvent.type)
    .filter(rule => !rule.effectiveFrom || normalizedEvent.asOf >= rule.effectiveFrom)
    .filter(rule => !rule.effectiveTo || normalizedEvent.asOf <= rule.effectiveTo)
    .sort((a,b) => Number(b.priority ?? 0) - Number(a.priority ?? 0))
    .map(rule => ({...rule, source: sourceLens(rule.source ?? {})}));
  const normalizedSources = sources.map(sourceLens);
  const perspectives = buildPerspectiveProfile({event:normalizedEvent, sources:normalizedSources, asma, rights, harms, remedies});
  const fingerprint = createHash('sha256').update(JSON.stringify({event:normalizedEvent, rules:matchedRules, perspectives})).digest('hex');
  return {
    event: normalizedEvent,
    perspectives,
    matchedRules,
    sourceLenses: normalizedSources,
    asma,
    rights,
    harms,
    remedies,
    fingerprint,
    modelOnly: true
  };
}

export function mergePerspectiveOutputs(outputs = []) {
  return outputs.reduce((acc, item) => {
    for (const key of ['R','G','B','L']) {
      if (item?.[key] !== undefined) acc[key] = item[key];
    }
    return acc;
  }, {});
}
