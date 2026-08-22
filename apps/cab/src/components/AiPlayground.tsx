import React, { useMemo, useState } from 'react';
import { api } from '../lib/api';
import uiConfig from '../data/ui-config.json';
import { useTranslation, type Locale } from '../lib/i18n';
import { Badge } from './ui/Badge';

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

function EvidenceList({ items, copy }: { items: any[]; copy: any }) {
  if (!items?.length) return <div className="mw-empty">{copy.noEvidence}</div>;
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

function VectorBars({ title, vector, labels, copy }: { title: string; vector: any[] | undefined; labels: string[]; copy: any }) {
  if (!Array.isArray(vector)) return <div className="mw-empty">{copy.noVector}</div>;
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

function RgblChain({ rgbl, copy }: { rgbl: any; copy: any }) {
  const axes = ['R', 'G', 'B', 'L'];
  return <><div className="mw-chain-label">{copy.rgblChain}</div><div className="mw-rgbl-chain">
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

function Lifecycle({ lifecycle, final, copy }: { lifecycle: any[] | undefined; final: any; copy: any }) {
  const states = Array.isArray(lifecycle) && lifecycle.length ? lifecycle : LIFECYCLE_ORDER;
  return <div className="mw-lifecycle">
    <div className="mw-ai-card-title">{copy.caseLifecycle}</div>
    <div className="mw-lifecycle-track">
      {states.map((state, index) => <React.Fragment key={`${state}-${index}`}>
        <div className={`mw-lifecycle-node ${state === final?.state ? 'current' : ''}`}>
          <span>{String(state).replace(/_/g, ' ')}</span>
        </div>
        {index < states.length - 1 && <div className="mw-lifecycle-line" />}
      </React.Fragment>)}
    </div>
    <div className="mw-boundary-note">{copy.lifecycleNote}</div>
  </div>;
}

function HumanReviewGate({ gate, copy }: { gate: any; copy: any }) {
  if (!gate) return <div className="mw-empty">{copy.noHumanReview}</div>;
  const reasons = Array.isArray(gate.reasons) ? gate.reasons : [];
  const gaps = Array.isArray(gate.evidenceGap) ? gate.evidenceGap : [];
  return <div className="mw-review-gate">
    <div className="mw-status-grid">
      <div><span>{copy.decision}</span><strong>{String(gate.decision ?? 'UNKNOWN').replace(/_/g, ' ')}</strong></div>
      <div><span>{copy.severity}</span><strong>{gate.severity ?? 'UNKNOWN'}</strong></div>
      <div><span>{copy.humanReviewLabel}</span><strong>{gate.requiresHumanReview ? copy.required : copy.notRequired}</strong></div>
      <div><span>{copy.adverseAction}</span><strong>{gate.adverseActionBlocked === false ? copy.notBlocked : copy.blocked}</strong></div>
    </div>
    {reasons.length > 0 && <div className="mw-review-list">{reasons.map((reason: any, index: number) => <div className="mw-list-row" key={`${reason?.code ?? 'reason'}-${index}`}><span>{reason?.code ?? 'REVIEW_REASON'}</span><p>{reason?.detail ?? 'Additional review is required.'}</p></div>)}</div>}
    {gaps.length > 0 && <div className="mw-boundary-note">{copy.evidenceGaps} {gaps.join(' · ')}</div>}
    <div className="mw-boundary-note">{gate.boundary ?? copy.safetyGateNote}</div>
  </div>;
}

export function AiPlayground({ locale = 'id', canAnalyze = true }: { locale?: Locale; canAnalyze?: boolean }) {
  const shellCopy = useTranslation(locale).shell;
  const copy = useTranslation(locale).playground;
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
      <div className="mw-section-head">
        <div>
          <h2>{shellCopy.aiPlayground}</h2>
          <p>{copy.description}</p>
        </div>
        <Badge tone="danger">{copy.simulation}</Badge>
      </div>
      <div className="mw-playground-badge">{persisted ? copy.persistedModelEvidence : copy.modelEvidence}</div>
    </div>

    <div className="mw-ai-card mw-ai-input-card">
      <div className="mw-ai-card-title">{copy.caseInput}</div>
      <div className="mw-demo-row">
        {DEMOS.map(d => <button key={d.label} className="mw-demo-chip" onClick={() => setText(d.text)}>{d.label}</button>)}
      </div>
      <div className="mw-ai-input-area">
        <textarea className="mw-ai-textarea mw-ai-textarea-large" aria-label={copy.caseInput} placeholder={copy.placeholder} value={text} onChange={e => setText(e.target.value)} />
        <div className="mw-input-footer">
          <span className="mw-muted">{copy.footerNote}</span>
          <div className="mw-ai-actions"><button className="mw-ai-btn" onClick={analyze} disabled={!canAnalyze || loading || !text.trim()}>{loading ? copy.btnRunning : copy.btnAnalyze}</button>{caseId && <button className="mw-ai-btn" onClick={async()=>{try{const saved:any=await api.universeResource(caseId);setResult(saved.entity?.data ?? saved);setPersisted(true);}catch(err){setError(err instanceof Error?err.message:'PERSISTENCE_READ_ERROR');}}}>{copy.btnReload}</button>}</div>
        </div>
        {!canAnalyze && <div className="mw-error" role="alert">{copy.disabled}</div>}
        {error && <div className="mw-error">{error}</div>}
      </div>
    </div>

    {result && <>
      <div className="mw-playground-kpis">
        <div><span>{copy.domain}</span><strong>{summary.domain}</strong></div>
        <div><span>{copy.mizanSignal}</span><strong>{scoreSuppressed ? '—' : score.toFixed(1)}</strong><small>{scoreSuppressed ? 'REVIEW / NON-FINAL' : (quranic?.status ?? band)}</small></div>
        <div><span>{copy.confidence}</span><strong>{Math.round(summary.confidence * 100)}%</strong></div>
        <div><span>{copy.evidence}</span><strong>{summary.evidenceCount}</strong></div>
      </div>

      <div className="mw-playground-tabs">
        {(['overview', 'semantic', 'lifecycle', 'trace'] as const).map(t => <button key={t} aria-label={copy.tabs[t]} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{copy.tabs[t]}</button>)}
      </div>

      {tab === 'overview' && <div className="mw-ai-dashboard mw-ai-dashboard-wide">
        <div className="mw-dashboard-left"><RgblChain rgbl={rgbl} copy={copy} /></div>
        <div className="mw-dashboard-right">
          <div className="mw-ai-card"><Lifecycle lifecycle={lifecycle} final={final} copy={copy} /></div>
          <div className="mw-ai-card"><div className="mw-ai-card-title">{copy.reviewGate}</div><HumanReviewGate gate={reviewGate} copy={shellCopy} /></div>
          {reminder && <div className="mw-ai-card"><div className="mw-ai-card-title">{copy.wakefulnessReminder}</div><div className="mw-status-grid"><div><span>{copy.action}</span><strong>{reminder.action}</strong></div><div><span>{copy.trigger}</span><strong>{reminder.triggerAt}</strong></div><div><span>{copy.owner}</span><strong>{reminder.ownerRid}</strong></div></div></div>}
        </div>
      </div>}

      {tab === 'semantic' && <div className="mw-ai-dashboard">
        <div className="mw-dashboard-left">
          <div className="mw-ai-card"><VectorBars title="ACTION GATES" vector={gate} labels={uiConfig.gateLabels} copy={copy} /></div>
          <div className="mw-ai-card"><VectorBars title="IMPACT VECTORS" vector={impact} labels={uiConfig.impactLabels} copy={copy} /></div>
        </div>
        <div className="mw-dashboard-right">
          <div className="mw-ai-card"><div className="mw-ai-card-title">{copy.alternatives}</div>{alternatives.length > 0 ? <div className="mw-review-list">{alternatives.map((alt: any, i: number) => <div className="mw-list-row" key={i}><span>{alt.probability ? `${Math.round(alt.probability * 100)}%` : 'ALT'}</span><p>{alt.text ?? alt}</p></div>)}</div> : <div className="mw-empty">{copy.noAlternatives}</div>}</div>
          <div className="mw-ai-card"><div className="mw-ai-card-title">{copy.conflicts}</div>{conflicts.length > 0 ? <div className="mw-review-list">{conflicts.map((c: any, i: number) => <div className="mw-list-row" key={i}><span>{c.severity ?? 'WARN'}</span><p>{c.description ?? c.text ?? c}</p></div>)}</div> : <div className="mw-empty">{copy.noConflicts}</div>}</div>
          <div className="mw-ai-card"><div className="mw-ai-card-title">{copy.evidenceCorroboration}</div><div className="mw-status-grid"><div><span>{copy.epistemicState}</span><strong>{evidenceState || 'OBSERVED'}</strong></div><div><span>{copy.verification}</span><strong>{quranic?.epistemic?.verificationRequired ? copy.required : copy.notRequired}</strong></div></div><EvidenceList items={evidence} copy={shellCopy} /></div>
        </div>
      </div>}

      {tab === 'lifecycle' && <div className="mw-ai-dashboard mw-ai-dashboard-wide">
        <div className="mw-dashboard-left">
          <div className="mw-ai-card"><div className="mw-ai-card-title">{copy.causalityGraph}</div><div className="mw-status-grid"><div><span>{copy.rootCause}</span><strong>{model?.causality?.rootCause ?? '—'}</strong></div><div><span>{copy.trigger}</span><strong>{model?.causality?.trigger ?? '—'}</strong></div></div><div className="mw-boundary-note">{copy.derivedProbabilistic}</div></div>
          {model?.causality?.chain?.length > 0 && <div className="mw-ai-card"><div className="mw-review-list">{model.causality.chain.map((c: any, i: number) => <div className="mw-list-row" key={i}><span>STEP {i + 1}</span><p>{c.event ?? c.description ?? c}</p></div>)}</div></div>}
        </div>
        <div className="mw-dashboard-right">
          <div className="mw-ai-card"><div className="mw-ai-card-title">{copy.temporalProfile}</div><div className="mw-status-grid"><div><span>{copy.onset}</span><strong>{model?.time?.onset ?? '—'}</strong></div><div><span>{copy.duration}</span><strong>{model?.time?.duration ?? '—'}</strong></div></div></div>
          {model?.actors?.length > 0 && <div className="mw-ai-card"><div className="mw-ai-card-title">{copy.inferredActors}</div><div className="mw-review-list">{model.actors.map((actor: any, i: number) => <div className="mw-list-row" key={i}><span>{actor.role ?? 'ACTOR'}</span><p>{actor.identity ?? actor.name ?? actor}</p></div>)}</div></div>}
        </div>
      </div>}

      {tab === 'trace' && <div className="mw-ai-dashboard mw-ai-dashboard-wide">
        <div className="mw-dashboard-left"><div className="mw-ai-card"><div className="mw-ai-card-title">{copy.mizanTrace}</div>
          {traceStages.length > 0 ? <div className="mw-trace-stack">{traceStages.map((t: any, i: number) => <div className="mw-trace-row" key={i}><strong>{t.stage ?? `S${i}`}</strong><p>{t.reason ?? t.result ?? t}</p></div>)}</div> : <div className="mw-empty">{copy.noTrace}</div>}
        </div></div>
        <div className="mw-dashboard-right">
          {quranic && <div className="mw-ai-card"><div className="mw-ai-card-title">{copy.quranicGrounding}</div>
            {quranic ? <><div className="mw-status-grid"><div><span>{copy.coverage}</span><strong>{quranic?.quranGrounding?.coverage ?? 'NONE'}</strong></div><div><span>{copy.status}</span><strong>{quranic?.status ?? 'UNKNOWN'}</strong></div></div>{quranic?.quranGrounding?.refs?.length > 0 && <div className="mw-boundary-note">References: {quranic.quranGrounding.refs.join(', ')}</div>}</> : <div className="mw-empty">{copy.notAvailable}</div>}
          </div>}
          {result?.revelationBinding && <div className="mw-ai-card"><div className="mw-ai-card-title">{copy.pureRevelation}</div><div className="mw-status-grid"><div><span>{copy.status}</span><strong>{result.revelationBinding.status}</strong></div><div><span>{copy.concept}</span><strong>{result.revelationBinding.concept}</strong></div><div><span>{copy.confidence}</span><strong>{Math.round((result.revelationBinding.confidence || 0) * 100)}%</strong></div></div><div className="mw-boundary-note">{result.revelationBinding.languageBridge?.normativeAuthority === false ? copy.noNormative : copy.warningBinding}</div></div>}
        </div>
      </div>}
    </>}
  </div>;
}
