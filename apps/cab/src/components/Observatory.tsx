import { useEffect, useState } from 'react';
import { AuditTimeline, WorldStateSnapshot } from '@moonwitness/ui';
import { Badge } from './ui/Badge';
import { api } from '../lib/api';
import { useTranslation, type Locale } from '../lib/i18n';

export function Observatory({ locale = 'id' }: { locale?: Locale }) {
  const copy = useTranslation(locale).observatory;
  const pgCopy = useTranslation(locale).playground;
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
    <div className="mw-playground-hero">
      <div className="mw-section-head">
        <div>
          <div className="mw-eyebrow">{copy.eyebrow}</div>
          <h2>{copy.title}</h2>
          <p>{copy.text}</p>
        </div>
        <Badge tone="danger">{pgCopy.humanAuthority}</Badge>
      </div>
      <div className="mw-playground-badge">{copy.livePoll}</div>
    </div>
    {busy && !graph ? <div className="mw-ai-card">{copy.loading}</div> : <div className="mw-governed-pair"><WorldStateSnapshot entities={graph?.entities?.length??0} relations={graph?.relations?.length??0} events={graph?.events?.length??0} integrity={typeof integrity?.ok==='boolean'?integrity.ok:null} mode="observed"/><AuditTimeline entries={ledger.map((entry:any,index:number)=>({id:entry.ledgerId??`${index}`,type:entry.type??'LEDGER_EVENT',subject:entry.entityId,actor:entry.actorId??entry.actorRid,time:entry.recordedAt??entry.timestamp,detail:entry.summary}))}/></div>}
  </div>;
}
