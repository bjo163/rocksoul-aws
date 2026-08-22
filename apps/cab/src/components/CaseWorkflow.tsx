import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';

type WorkflowStep = 'case' | 'evidence' | 'analysis' | 'review' | 'witness' | 'audit';

const steps: Array<{ id: WorkflowStep; label: string }> = [
  { id: 'case', label: 'Case' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'review', label: 'Human review' },
  { id: 'witness', label: 'Witness' },
  { id: 'audit', label: 'Audit' },
];

function newCaseId(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 17);
  return `CASE-LOCAL-${stamp}`;
}

function ErrorMessage({ error }: { error: string }) {
  return error ? <div className="mw-error" role="alert">{error}</div> : null;
}

export function CaseWorkflow({ user }: { user: any }) {
  const [caseId, setCaseId] = useState(newCaseId);
  const [text, setText] = useState('');
  const [source, setSource] = useState('CAB_LOCAL');
  const [observation, setObservation] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [evidenceType, setEvidenceType] = useState('DOCUMENT');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [evidenceStatus, setEvidenceStatus] = useState('VERIFIED');
  const [confidence, setConfidence] = useState('0.8');
  const [analysis, setAnalysis] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [rationale, setRationale] = useState('Evidence reviewed; retain the analytical safety gate.');
  const [witness, setWitness] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [resource, setResource] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const completed = useMemo(() => new Set<WorkflowStep>([
    ...(observation ? ['case' as const] : []),
    ...(evidence.length ? ['evidence' as const] : []),
    ...(analysis ? ['analysis' as const] : []),
    ...(review?.status === 'DISPOSED' ? ['review' as const] : []),
    ...(analysis?.witness || witness ? ['witness' as const] : []),
    ...(audit?.integrity?.valid ? ['audit' as const] : []),
  ]), [observation, evidence, analysis, review, witness, audit]);

  const run = async (name: string, work: () => Promise<void>) => {
    setBusy(name); setError('');
    try { await work(); }
    catch (err) { setError(err instanceof Error ? err.message : 'WORKFLOW_ERROR'); }
    finally { setBusy(''); }
  };

  const refreshCase = async () => {
    const [caseData, evidenceData, auditData, witnessData] = await Promise.all([
      api.universeResource(caseId), api.evidence(caseId), api.resourceAudit(caseId), api.witnessStatus(),
    ]);
    setResource(caseData);
    setEvidence((evidenceData as any)?.evidence ?? []);
    setAudit(auditData);
    setWitness(witnessData);
  };

  const observe = () => run('observe', async () => {
    if (!caseId.trim() || !text.trim()) throw new Error('Case ID and observation text are required.');
    const data = await api.universeObserve({ entityId: caseId.trim(), source: source.trim() || 'CAB_LOCAL', payload: { text: text.trim() } });
    setObservation(data);
    setResource(await api.universeResource(caseId.trim()));
  });

  const attachEvidence = () => run('evidence', async () => {
    if (!observation) throw new Error('Record the case before attaching evidence.');
    if (!evidenceReference.trim()) throw new Error('Evidence reference is required.');
    const evidenceId = `EVD-${caseId}-${Date.now()}`;
    await api.attachEvidence(caseId, {
      evidenceId,
      sourceType: evidenceType,
      reference: evidenceReference.trim(),
      status: evidenceStatus,
      confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
      payload: { note: 'Submitted through CAB Case Workflow' },
    });
    const data: any = await api.evidence(caseId);
    setEvidence(data.evidence ?? []);
    setEvidenceReference('');
  });

  const analyze = () => run('analysis', async () => {
    if (!observation) throw new Error('Record the case before analysis.');
    const data: any = await api.universeAnalyze({ caseId, text, includeReminder: true });
    setAnalysis(data);
    setWitness(await api.witnessStatus());
  });

  const queueReview = () => run('review', async () => {
    if (!analysis) throw new Error('Persist analysis before human review.');
    const data: any = await api.createReview({
      targetId: caseId,
      gateDecision: analysis?.reviewGate?.decision ?? 'REQUIRE_HUMAN_REVIEW',
      evidenceRefs: evidence.map(item => item.evidenceId),
    });
    setReview(data);
  });

  const transition = (status: string) => run(`review-${status}`, async () => {
    if (!review) throw new Error('Queue a review first.');
    const body: any = { status };
    if (status === 'ASSIGNED') body.assigneeId = user?.userId;
    if (status === 'DISPOSED') {
      if (!rationale.trim()) throw new Error('Reviewer rationale is required.');
      body.disposition = 'UPHOLD_GATE';
      body.rationale = rationale.trim();
    }
    setReview(await api.transitionReview(review.reviewId, body));
  });

  const verifyTrail = () => run('verify', refreshCase);

  const reset = () => {
    setCaseId(newCaseId()); setText(''); setObservation(null); setEvidence([]); setEvidenceReference('');
    setAnalysis(null); setReview(null); setWitness(null); setAudit(null); setResource(null); setError('');
  };

  const score = analysis?.mizan?.assessment?.accountabilityScore ?? analysis?.mizan?.accountabilityScore ?? '—';
  const gate = analysis?.reviewGate?.decision ?? 'NOT ANALYZED';

  return <div className="mw-stack mw-case-workflow">
    <div className="mw-playground-hero">
      <div><div className="mw-eyebrow">GUIDED LOCAL OPERATION</div><h2>Case Workflow</h2><p>Record a real-world observation, attach evidence, persist analysis, complete human review, and verify the Witness and audit trail from one screen.</p></div>
      <div className="mw-playground-badge">NO TERMINAL REQUIRED</div>
    </div>

    <div className="mw-workflow-progress" aria-label="Case workflow progress">
      {steps.map((step, index) => <div key={step.id} className={completed.has(step.id) ? 'complete' : ''}><span>{completed.has(step.id) ? '✓' : index + 1}</span><strong>{step.label}</strong></div>)}
    </div>
    <ErrorMessage error={error} />

    <div className="mw-workflow-grid">
      <Card><CardHeader><div className="mw-eyebrow">STEP 1</div><CardTitle>Record case</CardTitle></CardHeader><CardContent><div className="mw-form">
        <label className="mw-field"><span>Case ID</span><Input aria-label="Case ID" value={caseId} onChange={event => setCaseId(event.target.value)} disabled={Boolean(observation)} /></label>
        <label className="mw-field"><span>Observation source</span><Input aria-label="Observation source" value={source} onChange={event => setSource(event.target.value)} disabled={Boolean(observation)} /></label>
        <label className="mw-field"><span>What happened?</span><textarea aria-label="Case observation" className="mw-ai-textarea mw-case-textarea" value={text} onChange={event => setText(event.target.value)} disabled={Boolean(observation)} placeholder="Describe actors, actions, timing, known facts, and uncertainty." /></label>
        <div className="mw-workflow-actions"><Button onClick={observe} disabled={Boolean(observation) || busy !== ''}>{busy === 'observe' ? 'Recording…' : observation ? 'Case recorded' : 'Record case'}</Button><Button variant="ghost" onClick={reset} disabled={busy !== ''}>New blank case</Button></div>
      </div></CardContent></Card>

      <Card><CardHeader><div className="mw-eyebrow">STEP 2</div><CardTitle>Attach evidence</CardTitle></CardHeader><CardContent><div className="mw-form">
        <div className="mw-form-row"><label className="mw-field"><span>Source type</span><select aria-label="Evidence source type" value={evidenceType} onChange={event => setEvidenceType(event.target.value)}><option>DOCUMENT</option><option>TESTIMONY</option><option>SYSTEM_RECORD</option><option>PHOTO_VIDEO</option><option>USER_SUBMITTED</option></select></label><label className="mw-field"><span>Status</span><select aria-label="Evidence status" value={evidenceStatus} onChange={event => setEvidenceStatus(event.target.value)}><option>VERIFIED</option><option>SUPPORTED</option><option>OBSERVED</option><option>CORROBORATED</option><option>CONFLICTED</option><option>UNKNOWN</option></select></label></div>
        <label className="mw-field"><span>Reference</span><Input aria-label="Evidence reference" value={evidenceReference} onChange={event => setEvidenceReference(event.target.value)} placeholder="Document number, local file reference, or source note" /></label>
        <label className="mw-field"><span>Confidence (0–1)</span><Input aria-label="Evidence confidence" type="number" min="0" max="1" step="0.1" value={confidence} onChange={event => setConfidence(event.target.value)} /></label>
        <Button onClick={attachEvidence} disabled={!observation || busy !== ''}>{busy === 'evidence' ? 'Attaching…' : 'Attach evidence'}</Button>
        <div className="mw-compact-list">{evidence.length ? evidence.map(item => <div key={item.evidenceId}><Badge>{item.status}</Badge><span>{item.reference ?? item.evidenceId}</span></div>) : <p className="mw-muted">No evidence attached.</p>}</div>
      </div></CardContent></Card>

      <Card><CardHeader><div className="mw-eyebrow">STEP 3</div><CardTitle>Persist analysis</CardTitle></CardHeader><CardContent><div className="mw-form">
        <p className="mw-muted">Analysis reloads the evidence currently attached to this case and commits its result to Witness.</p>
        <Button onClick={analyze} disabled={!observation || busy !== ''}>{busy === 'analysis' ? 'Analyzing…' : analysis ? 'Re-analyze with current evidence' : 'Analyze case'}</Button>
        <div className="mw-status-grid"><div><span>Status</span><strong>{analysis?.status ?? 'PENDING'}</strong></div><div><span>Mīzān score</span><strong>{score}</strong></div><div><span>Review gate</span><strong>{gate}</strong></div><div><span>Witness commit</span><strong>{analysis?.witness?.hash ? 'COMMITTED' : 'PENDING'}</strong></div></div>
        {analysis?.reviewGate?.boundary && <div className="mw-boundary-note">{analysis.reviewGate.boundary}</div>}
      </div></CardContent></Card>

      <Card><CardHeader><div className="mw-eyebrow">STEP 4</div><CardTitle>Human review</CardTitle></CardHeader><CardContent><div className="mw-form">
        {!review ? <Button onClick={queueReview} disabled={!analysis || busy !== ''}>Queue human review</Button> : <><div className="mw-status-grid"><div><span>Status</span><strong>{review.status}</strong></div><div><span>Disposition</span><strong>{review.disposition ?? 'PENDING'}</strong></div></div><label className="mw-field"><span>Reviewer rationale</span><textarea aria-label="Reviewer rationale" className="mw-ai-textarea mw-review-rationale" value={rationale} onChange={event => setRationale(event.target.value)} /></label><div className="mw-workflow-actions">
          {review.status === 'QUEUED' && <Button onClick={() => transition('ASSIGNED')} disabled={busy !== ''}>Assign to me</Button>}
          {['QUEUED', 'ASSIGNED', 'EVIDENCE_REQUESTED', 'ESCALATED', 'REOPENED'].includes(review.status) && <Button onClick={() => transition('ACKNOWLEDGED')} disabled={busy !== ''}>Acknowledge</Button>}
          {review.status === 'ACKNOWLEDGED' && <Button onClick={() => transition('DISPOSED')} disabled={busy !== '' || !rationale.trim()}>Dispose: uphold gate</Button>}
        </div></>}
        <div className="mw-boundary-note">Human disposition is operational review. It does not rewrite the source analysis or become Divine judgement.</div>
      </div></CardContent></Card>
    </div>

    <Card><CardHeader><div className="mw-eyebrow">STEPS 5–6</div><CardTitle>Witness and audit verification</CardTitle></CardHeader><CardContent><div className="mw-form">
      <Button onClick={verifyTrail} disabled={!analysis || busy !== ''}>{busy === 'verify' ? 'Verifying…' : 'Refresh verified trail'}</Button>
      <div className="mw-workflow-verification"><div><span>Witness DAG</span><strong>{witness?.valid ? 'VALID' : 'PENDING'}</strong><small>{witness?.nodes ?? 0} nodes · {witness?.root?.slice(0, 18) ?? 'no root'}…</small></div><div><span>Audit chain</span><strong>{audit?.integrity?.valid ? 'VALID' : 'PENDING'}</strong><small>{audit?.audit?.length ?? 0} case records · {audit?.integrity?.count ?? 0} global records</small></div><div><span>Persisted case</span><strong>{resource?.entity?.status ?? 'PENDING'}</strong><small>version {resource?.entity?.version ?? '—'} · {resource?.events?.length ?? 0} events</small></div></div>
      {analysis?.witness?.hash && <div className="mw-hash-block"><span>Analysis Witness hash</span><code>{analysis.witness.hash}</code></div>}
    </div></CardContent></Card>
  </div>;
}
