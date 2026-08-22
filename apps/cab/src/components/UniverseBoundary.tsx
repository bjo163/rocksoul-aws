import { Badge } from './ui/Badge';

type Props = {
  unresolved: number;
  evidence: number;
  integrity: boolean | null;
};

export function UniverseBoundary({ unresolved, evidence, integrity }: Props) {
  const state = unresolved > 0 ? 'UNRESOLVED_PRESENT' : evidence === 0 ? 'NO_EVIDENCE' : integrity === false ? 'INTEGRITY_ALERT' : 'READY';
  const tone = state === 'READY' ? 'positive' : state === 'INTEGRITY_ALERT' ? 'danger' : 'warning';
  return <section className="mw-governed" aria-label="Universe uncertainty boundary" data-testid="cab-universe-boundary">
    <header><div><span className="mw-eyebrow">EPISTEMIC BOUNDARY</span><h3>Uncertainty & Empty State</h3></div><Badge tone={tone}>{state}</Badge></header>
    <div className="mw-governed-grid">
      <div><span>Unresolved nodes</span><strong>{unresolved}</strong></div>
      <div><span>Evidence records</span><strong>{evidence}</strong></div>
      <div><span>Graph integrity</span><strong>{integrity === true ? 'VALID' : integrity === false ? 'INVALID' : 'PENDING'}</strong></div>
    </div>
    <p className="mw-governed-boundary">
      Empty or unresolved data is displayed as missing knowledge, never as negative proof. No automated state in this panel is a Divine, legal, or factual verdict.
    </p>
  </section>;
}
