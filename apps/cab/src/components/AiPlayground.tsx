import React, { useMemo, useState } from 'react';
import { api } from '../lib/api';
import uiConfig from '../data/ui-config.json';

const DEMOS = uiConfig.aiExamples;
const RGBL_LABELS: Record<string, string> = uiConfig.rgblLabels;
const LIFECYCLE_ORDER = uiConfig.lifecycleOrder as string[];

function clampSigned(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}

function pct(value: unknown): number {
  return Math.round(Math.abs(clampSigned(value)) * 100);
}

function statusOf(node: any): string {
  return String(node?.status ?? 'UNKNOWN').toUpperCase();
}

function EvidenceList({ items }: { items: any[] }) {
  if (!items?.length) return <div className="mw-empty">No evidence attached yet.</div>;
  return <div className="mw-evidence-list">
    {items.slice(0, 12).map((item, idx) => (
      <div className="mw-evidence-row" key={`${item?.id ?? item?.reference ?? 'e'}-${idx}`}>
        <span className="mw-evidence-type">{item?.type ?? item?.sourceType ?? 'SOURCE'}</span>
        <span className="mw-evidence-ref">{item?.reference ?? item?.ref ?? item?.id ?? 'unreferenced'}</span>
        <span className="mw-evidence-status">{statusOf(item)}</span>
      </div>
    ))}
  </div>;
}

function VectorBars({ title, vector, labels }: { title: string; vector: any[] | undefined; labels: string[] }) {
  if (!Array.isArray(vector)) return <div className="mw-empty">No vector supplied by the semantic provider.</div>;
  return <div className="mw-vector-stack">
    <div className="mw-ai-card-title">{title}</div>
    {vector.map((raw, index) => {
      const n = Number(raw) || 0;
      const magnitude = Math.min(1, Math.abs(n));
      return <div className="mw-vector-row" key={`${labels[index] ?? index}`}>
        <div className="mw-vector-head"><span>{labels[index] ?? `V${index + 1}`}</span><strong>{n.toFixed(2)}</strong></div>
        <div className="mw-vector-track"><div className={`mw-vector-fill ${n < 0 ? 'negative' : 'positive'}`} style={{ width: `${magnitude * 100}%` }} /></div>
      </div>;
    })}
  </div>;
}

function RgblChain({ rgbl }: { rgbl: any }) {
  const axes = ['R', 'G', 'B', 'L'];
  return <><div className="mw-chain-label">RGBL INTENTION CHAIN · R → G → B → L</div><div className="mw-rgbl-chain">
    {axes.map((axis, idx) => {
      const node = rgbl?.[axis] ?? {};
      const val = clampSigned(node?.value ?? node?.score ?? 0);
      return <React.Fragment key={axis}>
        <div className={`mw-rgbl-node ${val < 0 ? 'negative' : 'positive'}`}>
          <div className="mw-rgbl-letter">{axis}</div>
          <div className="mw-rgbl-title">{RGBL_LABELS[axis]}</div>
          <div className="mw-rgbl-value">{val.toFixed(2)}</div>
          <div className="mw-rgbl-meta">{statusOf(node)} · {Math.round((Number(node?.confidence) || 0) * 100)}%</div>
          {node?.label && <div className="mw-rgbl-label">{node.label}</div>}
        </div>
        {idx < axes.length - 1 && <div className="mw-rgbl-arrow">→</div>}
      </React.Fragment>;
    })}
  </div></>;
}

function Lifecycle({ lifecycle, final }: { lifecycle: any[] | undefined; final: any }) {
  const states = Array.isArray(lifecycle) && lifecycle.length ? lifecycle : LIFECYCLE_ORDER;
  return <div className="mw-lifecycle">
    <div className="mw-ai-card-title">CASE LIFECYCLE</div>
    <div className="mw-lifecycle-track">
      {states.map((state, index) => <React.Fragment key={`${state}-${index}`}>
        <div className={`mw-lifecycle-node ${state === final?.state ? 'current' : ''}`}>
          <span>{String(state).replace(/_/g, ' ')}</span>
        </div>
        {index < states.length - 1 && <div className="mw-lifecycle-line" />}
      </React.Fragment>)}
    </div>
    <div className="mw-boundary-note">Modelled lifecycle only · unseen/final outcomes are not directly observed by the software.</div>
  </div>;
}

function HumanReviewGate({ gate }: { gate: any }) {
  if (!gate) return <div className="mw-empty">No human-review gate supplied.</div>;
  const reasons = Array.isArray(gate.reasons) ? gate.reasons : [];
  const gaps = Array.isArray(gate.evidenceGap) ? gate.evidenceGap : [];
  return <div className="mw-review-gate">
    <div className="mw-status-grid">
      <div><span>Decision</span><strong>{String(gate.decision ?? 'UNKNOWN').replace(/_/g, ' ')}</strong></div>
      <div><span>Severity</span><strong>{gate.severity ?? 'UNKNOWN'}</strong></div>
      <div><span>Human review</span><strong>{gate.requiresHumanReview ? 'REQUIRED' : 'NOT REQUIRED'}</strong></div>
      <div><span>Adverse action</span><strong>{gate.adverseActionBlocked === false ? 'NOT BLOCKED' : 'BLOCKED'}</strong></div>
    </div>
    {reasons.length > 0 && <div className="mw-review-list">{reasons.map((reason: any, index: number) => <div className="mw-list-row" key={`${reason?.code ?? 'reason'}-${index}`}><span>{reason?.code ?? 'REVIEW_REASON'}</span><p>{reason?.detail ?? 'Additional review is required.'}</p></div>)}</div>}
    {gaps.length > 0 && <div className="mw-boundary-note">Evidence gaps: {gaps.join(' · ')}</div>}
    <div className="mw-boundary-note">{gate.boundary ?? 'Analytical safety gate only; not a divine verdict.'}</div>
  </div>;
}

export function AiPlayground({ locale = 'id', canAnalyze = true }: { locale?: 'id' | 'en'; canAnalyze?: boolean }) {
  const copy = locale === 'id'
    ? { eyebrow: 'ANALISIS TERKELOLA', title: 'Observatorium Semantik', text: 'Analisis satu kasus melalui interpretasi semantik, RGBL, gerbang tindakan, dampak, waktu, kausalitas, bukti, dan Mīzān.', disabled: 'RID diperlukan sebelum analisis dapat disimpan.' }
    : { eyebrow: 'GOVERNED ANALYSIS', title: 'Semantic observatory', text: 'Analyze one case through semantic interpretation, RGBL, action gates, impacts, time, causality, evidence, and Mīzān.', disabled: 'An RID is required before analysis can be persisted.' };
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'semantic' | 'lifecycle' | 'trace'>('overview');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data: any = await api.universeAnalyze({ observation: { text }, includeReminder: true });
      setResult(data);
      setCaseId(typeof data?.id === 'string' ? data.id : null);
      setPersisted(Boolean(data?.persisted?.entityId));
      setTab('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const model = result?.lifecycle ?? result?.caseLifecycle ?? result?.lifecycleModel ?? result;
  const mizan = result?.mizan ?? result?.mizanResult ?? result?.assessment ?? {};
  const quranic = result?.quranicMizan ?? result?.mizan?.quranic ?? result?.analysis?.quranicMizan ?? null;
  const reviewGate = result?.reviewGate ?? result?.analysis?.reviewGate ?? null;
  const rgbl = result?.intention?.chain ?? result?.intention?.rgbl ?? result?.semantic?.rgbl ?? result?.rgbl ?? {};
  const gate = result?.actionGateVector ?? result?.semantic?.actionGateVector ?? result?.vectors?.actionGate ?? [];
  const impact = result?.impactVector ?? result?.semantic?.impactVector ?? result?.vectors?.impact ?? [];
  const evidence = result?.evidence?.items ?? result?.evidence ?? result?.mizan?.evidence ?? [];
  const final = model?.final ?? result?.final ?? {};
  const score = Number(mizan?.accountabilityScore ?? mizan?.score ?? result?.accountabilityScore ?? 0);
  const band = String(mizan?.band ?? result?.band ?? 'UNRESOLVED').toUpperCase();
  const alternatives = result?.alternatives ?? result?.hypotheses?.alternatives ?? [];
  const conflicts = result?.conflicts ?? result?.hypotheses?.conflicts ?? [];
  const evidenceState = String(quranic?.epistemic?.evidenceState ?? result?.evidenceState ?? '').toUpperCase();
  const scoreSuppressed = reviewGate?.decision === 'BLOCK_ADVERSE_ACTION' || reviewGate?.requiresHumanReview || evidenceState.includes('CONFLICT') || evidenceState === 'UNKNOWN' || evidenceState === 'INSUFFICIENT';
  const trace = result?.mizan?.trace ?? result?.mizanTrace ?? result?.trace ?? [];
  const traceStages = Array.isArray(trace) ? trace : (Array.isArray(trace?.stages) ? trace.stages : []);
  const lifecycle = model?.states ?? model?.lifecycle ?? result?.lifecycle ?? result?.visualization?.stages?.map((s: any) => s.state) ?? [];
  const reminder = result?.reminderBundle ?? null;


  const summary = useMemo(() => ({
    score,
    band,
    domain: result?.domain?.primary?.label ?? result?.domain?.primary ?? result?.domain ?? 'UNRESOLVED',
    confidence: Number(result?.confidence ?? result?.semantic?.confidence ?? 0),
    evidenceCount: Array.isArray(evidence) ? evidence.length : 0,
  }), [score, band, result, evidence]);

  return <div className="mw-ai-playground">
    <div className="mw-playground-hero">
      <div>
        <div className="mw-eyebrow">{copy.eyebrow}</div>
        <h2>{copy.title}</h2>
        <p>{copy.text}</p>
      </div>
      <div className="mw-playground-badge">{persisted ? 'PERSISTED · MODEL + EVIDENCE' : 'MODEL + EVIDENCE'}</div>
    </div>

    <div className="mw-ai-card mw-ai-input-card">
      <div className="mw-ai-card-title">CASE INPUT</div>
      <div className="mw-demo-row">
        {DEMOS.map(d => <button key={d.label} className="mw-demo-chip" onClick={() => setText(d.text)}>{d.label}</button>)}
      </div>
      <div className="mw-ai-input-area">
        <textarea className="mw-ai-textarea mw-ai-textarea-large" placeholder="Describe an event, action, observation, question, or case…" value={text} onChange={e => setText(e.target.value)} />
        <div className="mw-input-footer">
          <span className="mw-muted">The analyzer reports observed, inferred, supported and unknown information separately.</span>
          <div className="mw-ai-actions"><button className="mw-ai-btn" onClick={analyze} disabled={!canAnalyze || loading || !text.trim()}>{loading ? 'Running semantic pipeline…' : 'Analyze Case'}</button>{caseId && <button className="mw-ai-btn" onClick={async()=>{try{const saved:any=await api.universeResource(caseId);setResult(saved.entity?.data ?? saved);setPersisted(true);}catch(err){setError(err instanceof Error?err.message:'PERSISTENCE_READ_ERROR');}}}>Reload Case</button>}</div>
        </div>
        {!canAnalyze && <div className="mw-error" role="alert">{copy.disabled}</div>}
        {error && <div className="mw-error">{error}</div>}
      </div>
    </div>

    {result && <>
      <div className="mw-playground-kpis">
        <div><span>DOMAIN</span><strong>{summary.domain}</strong></div>
        <div><span>MĪZĀN SIGNAL</span><strong>{scoreSuppressed ? '—' : score.toFixed(1)}</strong><small>{scoreSuppressed ? 'REVIEW / NON-FINAL' : (quranic?.status ?? band)}</small></div>
        <div><span>CONFIDENCE</span><strong>{Math.round(summary.confidence * 100)}%</strong></div>
        <div><span>EVIDENCE</span><strong>{summary.evidenceCount}</strong></div>
      </div>

      <div className="mw-playground-tabs">
        {(['overview', 'semantic', 'lifecycle', 'trace'] as const).map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t.toUpperCase()}</button>)}
      </div>

      {tab === 'overview' && <div className="mw-ai-dashboard mw-ai-dashboard-wide">
        <div className="mw-ai-card mw-card-span-2"><div className="mw-ai-card-title">SEMANTIC INTERPRETATION</div><div className="mw-observation-statuses"><span>OBSERVED</span><span>INFERRED</span><span>SUPPORTED</span><span>UNKNOWN</span></div><RgblChain rgbl={rgbl} /></div>
        <div className="mw-ai-card"><div className="mw-ai-card-title">QUR’ANIC MĪZĀN STATUS</div><div className="mw-mizan-score"><div className={`mw-mizan-number ${score < 0 ? 'negative' : 'positive'}`}>{scoreSuppressed ? 'REVIEW REQUIRED' : (quranic?.status ?? 'UNRESOLVED')}</div><div className="mw-mizan-sub">{quranic?.epistemic?.evidenceState ?? 'NO EPISTEMIC STATE'} · {quranic?.quranGrounding?.coverage ?? 'NO GROUNDING'}</div></div><div className="mw-boundary-note">{quranic?.conditionalFinding ?? 'Numeric output is a secondary, non-normative software signal. Blocked, conflicted, or insufficient-evidence cases require human review and are not final determinations.'}</div></div>
        <div className="mw-ai-card"><div className="mw-ai-card-title">EVIDENCE</div><EvidenceList items={evidence} /></div>
        <div className="mw-ai-card mw-card-span-2"><div className="mw-ai-card-title">HUMAN REVIEW GATE</div><HumanReviewGate gate={reviewGate} /></div>
        <div className="mw-ai-card mw-card-span-2"><div className="mw-ai-card-title">CASE LIFECYCLE</div><Lifecycle lifecycle={lifecycle} final={final} /></div>
        <div className="mw-ai-card mw-card-span-2"><div className="mw-ai-card-title">SOURCED REMINDER</div>{reminder ? <div className="mw-reminder-grid"><div><span className="mw-muted">QURAN</span><strong>{reminder.quran?.reference ?? '—'}</strong></div><div><span className="mw-muted">ASMA</span><strong>{(reminder.asma ?? []).map((a: any) => a?.name).join(' · ') || '—'}</strong></div><div><span className="mw-muted">PRIOR SCRIPTURE</span><strong>{reminder.previousScripture?.book ?? '—'}</strong></div><div><span className="mw-muted">TEMPORAL CONTEXT</span><strong>{reminder.temporalContext?.patternId ?? '—'}</strong></div><div className="mw-boundary-note">Source-backed reminder bundle. Prior-scripture slot is metadata-only until a verified corpus is imported.</div></div> : <div className="mw-empty">No reminder bundle requested.</div>}</div>
      </div>}

      {tab === 'semantic' && <div className="mw-ai-dashboard mw-ai-dashboard-wide">
        <div className="mw-ai-card mw-card-span-2"><RgblChain rgbl={rgbl} /></div>
        <div className="mw-ai-card"><VectorBars title="9 ACTION GATE VECTOR" vector={gate} labels={uiConfig.gateLabels} /></div>
        <div className="mw-ai-card"><VectorBars title="13 IMPACT VECTOR" vector={impact} labels={uiConfig.impactLabels} /></div>
        <div className="mw-ai-card mw-card-span-2"><div className="mw-ai-card-title">QUR’ANIC GROUNDING</div>{quranic ? <div className="mw-status-grid"><div><span>Status</span><strong>{quranic.status}</strong></div><div><span>Evidence</span><strong>{quranic.epistemic?.evidenceState ?? '—'}</strong></div><div><span>Grounding</span><strong>{quranic.quranGrounding?.coverage ?? '—'}</strong></div><div><span>Verification</span><strong>{quranic.epistemic?.verificationRequired ? 'REQUIRED' : 'SATISFIED'}</strong></div><div><span>Intention</span><strong>{quranic.intention?.state ?? '—'}</strong></div><div><span>Heart known</span><strong>{quranic.intention?.heartKnown ? 'YES' : 'NO'}</strong></div></div> : <div className="mw-empty">No Qur’anic Mīzān protocol output.</div>}</div>
        <div className="mw-ai-card"><div className="mw-ai-card-title">ALTERNATIVE HYPOTHESES</div>{alternatives.length ? alternatives.map((a: any, i: number) => <div className="mw-list-row" key={i}><span>{a?.label ?? a?.hypothesis ?? `Alternative ${i + 1}`}</span><strong>{Math.round((Number(a?.confidence) || 0) * 100)}%</strong></div>) : <div className="mw-empty">No alternative hypotheses supplied.</div>}</div>
        <div className="mw-ai-card"><div className="mw-ai-card-title">CONFLICTS</div>{conflicts.length ? conflicts.map((c: any, i: number) => <div className="mw-conflict-row" key={i}><span>{c?.type ?? 'CONFLICT'}</span><p>{c?.description ?? c?.message ?? 'Conflicting evidence.'}</p></div>) : <div className="mw-empty">No conflicts detected.</div>}</div>
      </div>}

      {tab === 'lifecycle' && <div className="mw-ai-dashboard mw-ai-dashboard-wide">
        <div className="mw-ai-card mw-card-span-2"><Lifecycle lifecycle={lifecycle} final={final} /></div>
        <div className="mw-ai-card"><div className="mw-ai-card-title">FINAL MODEL STATE</div><div className="mw-final-state"><strong>{final?.state ?? 'UNRESOLVED'}</strong><span>{final?.destination ?? 'NOT_DETERMINABLE'}</span><small>{final?.divineVerdict ?? 'MODEL_ONLY'}</small></div></div>
        <div className="mw-ai-card"><div className="mw-ai-card-title">LIFECYCLE BOUNDARY</div><p className="mw-muted">The visualization can model cited concepts and system transitions. It does not observe or determine an actual unseen final outcome.</p></div>
      </div>}

      {tab === 'trace' && <div className="mw-ai-dashboard mw-ai-dashboard-wide">
        <div className="mw-ai-card mw-card-span-2"><div className="mw-ai-card-title">MĪZĀN TRACE</div><div className="mw-trace"><div className="mw-trace-line" />{traceStages.map((stage: any, i: number) => <div className="mw-trace-stage" key={`${stage?.stage ?? stage}-${i}`}><span>{String(stage?.stage ?? stage).toUpperCase()}</span><small>{stage?.status ?? 'COMPLETED'}</small>{stage?.summary && <p>{stage.summary}</p>}</div>)}</div></div>
        <div className="mw-ai-card"><div className="mw-ai-card-title">EVIDENCE PROVENANCE</div><EvidenceList items={evidence} /></div>
        <div className="mw-ai-card"><div className="mw-ai-card-title">REASONING STATUS</div><div className="mw-status-grid"><div><span>Observed</span><strong>{result?.observation?.status ?? '—'}</strong></div><div><span>Inference</span><strong>{result?.inference?.status ?? '—'}</strong></div><div><span>Resolution</span><strong>{result?.resolution?.status ?? '—'}</strong></div><div><span>Conflicts</span><strong>{conflicts.length}</strong></div></div></div>
      </div>}
    </>}
  </div>;
}
