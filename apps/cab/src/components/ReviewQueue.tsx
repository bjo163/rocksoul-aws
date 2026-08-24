import { useMemo, useState } from 'react';
import { AuditTimeline, EvidenceLedger, ReviewGatePanel, WitnessPanel, WorldStateSnapshot } from '@moonwitness/ui';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { useTranslation, type Locale } from '../lib/i18n';

type ReviewRecord = Record<string, unknown>;
function text(value: unknown): string | undefined { return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined; }
function records(value: unknown): ReviewRecord[] { return Array.isArray(value) ? value.filter((item): item is ReviewRecord => typeof item === 'object' && item !== null) : []; }
function nested(record: ReviewRecord, key: string): ReviewRecord | undefined { const value = record[key]; return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as ReviewRecord : undefined; }

export function ReviewQueue({ reviews, locale = 'id' }: { reviews: ReviewRecord[]; locale?: Locale }) {
  const copy = useTranslation(locale).shell;
  const [filter, setFilter] = useState('PENDING');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filteredReviews = reviews.filter((r) => (filter === 'ALL' ? true : (text(r.status) ?? 'PENDING') === filter));
  const selected = useMemo(() => selectedId ? reviews.find((review) => text(review.id) === selectedId) ?? filteredReviews[0] ?? null : filteredReviews[0] ?? null, [filteredReviews, reviews, selectedId]);
  const selectedGate = selected ? nested(selected, 'reviewGate') : undefined;
  const evidenceRefs = selected && Array.isArray(selected.evidenceRefs) ? selected.evidenceRefs.filter((value): value is string => typeof value === 'string') : [];
  const gateDecision = text(selected?.gateDecision ?? selectedGate?.decision) ?? 'NOT_EVALUATED';
  const gateSeverity = text(selected?.severity ?? selectedGate?.severity) ?? 'NOT_ASSESSED';
  const requiresHumanReview = selected ? selected.requiresHumanReview !== false : false;
  const audit = selected ? records(selected.audit ?? selected.auditEntries) : [];
  const witness = selected ? nested(selected, 'witness') : undefined;
  const reasons = Array.isArray(selected?.reasons) ? selected.reasons : Array.isArray(selectedGate?.reasons) ? selectedGate.reasons : [];

  return <div className="mw-ai-playground">
    <div className="mw-playground-hero"><div><div className="mw-eyebrow">{copy.reviewQueue}</div><h2>Review Queue</h2><p>Assign, acknowledge, request evidence, escalate, dispose, and reopen governed human reviews.</p></div></div>
    <div className="mw-filter-bar" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <Button variant={filter === 'PENDING' ? 'default' : 'ghost'} onClick={() => setFilter('PENDING')}>Pending</Button><Button variant={filter === 'IN_PROGRESS' ? 'default' : 'ghost'} onClick={() => setFilter('IN_PROGRESS')}>In Progress</Button><Button variant={filter === 'DISPOSED' ? 'default' : 'ghost'} onClick={() => setFilter('DISPOSED')}>Disposed</Button><Button variant={filter === 'ALL' ? 'default' : 'ghost'} onClick={() => setFilter('ALL')}>All</Button>
    </div>
    <Card><CardHeader><CardTitle>Reviews ({filteredReviews.length})</CardTitle></CardHeader><CardContent>{filteredReviews.length === 0 ? <div className="mw-empty">No reviews found for this filter.</div> : <table className="mw-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}><thead><tr style={{ borderBottom: '1px solid var(--mw-border)' }}><th style={{ padding: '8px' }}>ID</th><th style={{ padding: '8px' }}>Type</th><th style={{ padding: '8px' }}>Target</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px' }}>Action</th></tr></thead><tbody>{filteredReviews.map((review, i) => { const id = text(review.id) ?? `REV-${i}`; const status = text(review.status) ?? 'PENDING'; return <tr key={id} style={{ borderBottom: '1px solid var(--mw-border)' }}><td style={{ padding: '8px' }}>{id}</td><td style={{ padding: '8px' }}>{text(review.type) ?? 'GATE_REVIEW'}</td><td style={{ padding: '8px' }}>{text(review.targetId) ?? 'UNKNOWN'}</td><td style={{ padding: '8px' }}><Badge tone={status === 'DISPOSED' ? 'positive' : 'warning'}>{status}</Badge></td><td style={{ padding: '8px' }}><Button variant={selected?.id === review.id ? 'default' : 'ghost'} onClick={() => setSelectedId(text(review.id) ?? null)}>Open</Button></td></tr>; })}</tbody></table>}</CardContent></Card>
    <div className="mw-governed-pair"><ReviewGatePanel gate={selected ? { decision: gateDecision, severity: gateSeverity, requiresHumanReview, adverseActionBlocked: selected.adverseActionBlocked !== false, reasons, boundary: 'Review Queue records a governed operational decision boundary. It does not grant Divine judgement or final authority.' } : null}/><EvidenceLedger items={evidenceRefs.map((reference, index) => ({ id: `${text(selected?.id) ?? 'REVIEW'}-EVIDENCE-${index}`, status: 'OBSERVED', sourceType: 'REVIEW_REFERENCE', reference }))} emptyLabel={selected ? 'No evidence references attached to this review.' : 'Select a review to inspect its evidence references.'}/></div>
    <div className="mw-governed-pair"><WitnessPanel witness={{ state: text(witness?.state) ?? 'PENDING', hash: text(witness?.hash) ?? null, root: text(witness?.root) ?? null, nodeCount: typeof witness?.nodes === 'number' ? witness.nodes : null, checkpointId: text(witness?.checkpointId) ?? null }}/><AuditTimeline entries={audit.map((entry, index) => ({ id: text(entry.id) ?? `${text(selected?.id) ?? 'REVIEW'}-AUDIT-${index}`, type: text(entry.type ?? entry.action) ?? 'REVIEW_EVENT', subject: text(entry.subject ?? selected?.targetId), actor: text(entry.actor ?? entry.actorId), time: text(entry.time ?? entry.timestamp), detail: text(entry.detail ?? entry.reason) }))} emptyLabel={selected ? 'No audit entries attached to this review.' : 'Select a review to inspect its audit trail.'}/></div>
    <WorldStateSnapshot entities={selected ? 1 : 0} relations={evidenceRefs.length} events={selected ? audit.length : 0} integrity={text(witness?.state) === 'VALID' ? true : null} mode="observed"/>
  </div>;
}
