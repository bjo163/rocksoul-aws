import { useEffect, useState } from 'react';
import { AuditTimeline, WorldStateSnapshot } from '@moonwitness/ui';
import { api } from '../lib/api';

export function Observatory({ locale = 'id' }: { locale?: 'id' | 'en' }) {
  const copy = locale === 'id'
    ? { eyebrow: 'OBSERVATORIUM OPERASIONAL', title: 'Ringkasan Model Operasional', text: 'Entitas tersimpan, peristiwa, integritas graph, dan jejak aktivitas terbaru.', loading: 'Memuat observatorium…' }
    : { eyebrow: 'OPERATIONAL OBSERVATORY', title: 'Operational model overview', text: 'Persistent entities, events, graph integrity, and the latest recorded activity.', loading: 'Loading observatory…' };
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
    <div className="mw-playground-hero"><div><div className="mw-eyebrow">{copy.eyebrow}</div><h2>{copy.title}</h2><p>{copy.text}</p></div><div className="mw-playground-badge">LIVE POLL</div></div>
    {busy && !graph ? <div className="mw-ai-card">{copy.loading}</div> : <div className="mw-governed-pair"><WorldStateSnapshot entities={graph?.entities?.length??0} relations={graph?.relations?.length??0} events={graph?.events?.length??0} integrity={typeof integrity?.ok==='boolean'?integrity.ok:null} mode="observed"/><AuditTimeline entries={ledger.map((entry:any,index:number)=>({id:entry.ledgerId??`${index}`,type:entry.type??'LEDGER_EVENT',subject:entry.entityId,actor:entry.actorId??entry.actorRid,time:entry.recordedAt??entry.timestamp,detail:entry.summary}))}/></div>}
  </div>;
}
