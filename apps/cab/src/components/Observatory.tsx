import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function Observatory() {
  const [graph, setGraph] = useState<any>(null);
  const [integrity, setIntegrity] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const refresh = async () => {
    setBusy(true);
    try {
      const [g,i,l] = await Promise.all([api.kernelGraph(), api.kernelIntegrity(), api.kernelLedger()]);
      setGraph(g); setIntegrity(i); setLedger(Array.isArray(l) ? l.slice(-12).reverse() : []);
    } finally { setBusy(false); }
  };
  useEffect(() => { void refresh(); const id=window.setInterval(() => void refresh(), 5000); return () => window.clearInterval(id); }, []);
  return <div className="mw-ai-playground">
    <div className="mw-playground-hero"><div><div className="mw-eyebrow">UNIVERSE OS · OBSERVATORY</div><h2>World State Observatory</h2><p>Persistent entities, events, graph integrity and the latest audit trail.</p></div><div className="mw-playground-badge">LIVE POLL</div></div>
    {busy && !graph ? <div className="mw-ai-card">Loading observatory…</div> : <><div className="mw-playground-kpis">
      <div><span>ENTITIES</span><strong>{graph?.entities?.length ?? 0}</strong></div><div><span>RELATIONS</span><strong>{graph?.relations?.length ?? 0}</strong></div><div><span>EVENTS</span><strong>{graph?.events?.length ?? 0}</strong></div><div><span>INTEGRITY</span><strong>{integrity?.ok ? 'OK' : 'CHECK'}</strong></div>
    </div><div className="mw-ai-dashboard mw-ai-dashboard-wide"><div className="mw-ai-card mw-card-span-2"><div className="mw-ai-card-title">RECENT AUDIT EVENTS</div>{ledger.length ? ledger.map((e:any)=><div className="mw-list-row" key={e.ledgerId}><span>{e.type} · {e.entityId ?? '—'}</span><strong>{new Date(e.recordedAt).toLocaleTimeString()}</strong></div>) : <div className="mw-empty">No audit events recorded.</div>}</div><div className="mw-ai-card"><div className="mw-ai-card-title">GRAPH INTEGRITY</div><pre className="mw-json-block">{JSON.stringify(integrity,null,2)}</pre></div><div className="mw-ai-card"><div className="mw-ai-card-title">WORLD SNAPSHOT</div><pre className="mw-json-block">{JSON.stringify({entities:graph?.entities?.slice(-5),events:graph?.events?.slice(-5)},null,2)}</pre></div></div></>}
  </div>;
}
