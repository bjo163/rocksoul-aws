import { useEffect, useState } from 'react';
import { AuditTimeline, WorldStateSnapshot } from '@moonwitness/ui';
import { Badge } from './ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { api } from '../lib/api';
import { useTranslation, type Locale } from '../lib/i18n';

type JsonRecord = Record<string, unknown>;
type GraphNode = JsonRecord & { id?: string; kind?: string; lane?: string };
type GraphData = JsonRecord & { nodes?: GraphNode[]; relations?: JsonRecord[]; entities?: unknown[]; events?: unknown[] };
type IntegrityData = JsonRecord & { ok?: boolean };
type LedgerEntry = JsonRecord & { ledgerId?: string; entityId?: string; actorId?: string; actorRid?: string; recordedAt?: string; timestamp?: string; type?: string; summary?: string };

function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => typeof item === 'object' && item !== null) : [];
}

function LaneBadge({ lane }: { lane: string }) {
  const tone = lane === 'CORE' ? 'positive' : lane === 'DERIVED' ? 'info' : 'warning';
  return <Badge tone={tone}>{lane}</Badge>;
}

export function ObservatoryBase({ locale = 'id' }: { locale?: Locale }) {
  const copy = useTranslation(locale).observatory;
  const pgCopy = useTranslation(locale).playground;
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityData | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [prophets, setProphets] = useState<JsonRecord[]>([]);
  const [evidence, setEvidence] = useState<JsonRecord[]>([]);
  const [events, setEvents] = useState<JsonRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const refresh = async () => {
    setBusy(true);
    try {
      const [g, i, l, p, ev, e] = await Promise.all([
        api.kernelGraph(), api.kernelIntegrity(), api.kernelLedger(),
        api.entities('REVELATION.PROPHET_PROFILE'), api.entities('KNOWLEDGE.PROPHETIC_EVENT'), api.entities('KNOWLEDGE.EVIDENCE'),
      ]);
      setGraph(typeof g === 'object' && g !== null ? g as GraphData : null);
      setIntegrity(typeof i === 'object' && i !== null ? i as IntegrityData : null);
      setLedger(asRecords(l).map((entry) => entry as LedgerEntry).slice(-12).reverse());
      setProphets(asRecords(p)); setEvents(asRecords(ev)); setEvidence(asRecords(e));
    } finally { setBusy(false); }
  };
  useEffect(() => { void refresh(); const id = window.setInterval(() => void refresh(), 5000); return () => window.clearInterval(id); }, []);
  const nodes = graph?.nodes ?? [];
  const relations = graph?.relations ?? [];
  const coreNodes = nodes.filter((node) => node.lane === 'CORE');
  const derivedNodes = nodes.filter((node) => node.lane === 'DERIVED');
  const unresolvedNodes = nodes.filter((node) => node.lane === 'UNRESOLVED');
  return <div className="mw-stack" data-testid="cab-universe-observatory">
    <div className="mw-playground-hero"><div className="mw-section-head"><div><div className="mw-eyebrow">{copy.eyebrow}</div><h2>Universe Observatory</h2><p>World state, Revelation graph, evidence provenance and Prophet profiles projected from canonical entities.</p></div><Badge tone="danger">{pgCopy.humanAuthority}</Badge></div><div className="mw-playground-badge">{copy.livePoll}</div></div>
    {busy && !graph ? <div className="mw-ai-card">{copy.loading}</div> : <>
      <div className="mw-kpis mw-kpis-6">
        <div className="mw-kpi"><strong>WORLD</strong><span className="mw-kpi-title">Entities</span><b>{graph?.entities?.length ?? 0}</b></div>
        <div className="mw-kpi"><strong>GRAPH</strong><span className="mw-kpi-title">Relations</span><b>{relations.length}</b></div>
        <div className="mw-kpi"><strong>REVELATION</strong><span className="mw-kpi-title">Core</span><b>{coreNodes.length}</b></div>
        <div className="mw-kpi"><strong>DERIVED</strong><span className="mw-kpi-title">Derived</span><b>{derivedNodes.length}</b></div>
        <div className="mw-kpi"><strong>UNCERTAINTY</strong><span className="mw-kpi-title">Unresolved</span><b>{unresolvedNodes.length}</b></div>
        <div className="mw-kpi"><strong>KNOWLEDGE</strong><span className="mw-kpi-title">Evidence</span><b>{evidence.length}</b></div>
      </div>
      <div className="mw-governed-pair"><WorldStateSnapshot entities={graph?.entities?.length ?? 0} relations={relations.length} events={graph?.events?.length ?? events.length} integrity={typeof integrity?.ok === 'boolean' ? integrity.ok : null} mode="observed"/><AuditTimeline entries={ledger.map((entry, index) => ({ id: entry.ledgerId ?? `${index}`, type: entry.type ?? 'LEDGER_EVENT', subject: entry.entityId, actor: entry.actorId ?? entry.actorRid, time: entry.recordedAt ?? entry.timestamp, detail: entry.summary }))}/></div>
      <div className="mw-grid">
        <Card><CardHeader><div className="mw-eyebrow">REVELATION</div><CardTitle>Universe Graph</CardTitle></CardHeader><CardContent><div className="mw-stack">{nodes.slice(0,16).map((node) => <div key={node.id ?? JSON.stringify(node)} className="mw-route-placeholder"><strong>{node.kind}</strong><span>{node.id}</span><LaneBadge lane={node.lane ?? 'UNRESOLVED'}/></div>)}{nodes.length===0&&<div className="mw-muted">No graph nodes available.</div>}<div className="mw-muted">Relations: {relations.length}. Graph is a projection; no semantic decisions are made here.</div></div></CardContent></Card>
        <Card><CardHeader><div className="mw-eyebrow">KNOWLEDGE</div><CardTitle>Evidence & Provenance</CardTitle></CardHeader><CardContent><div className="mw-stack">{evidence.slice(0,10).map((item) => <div key={String(item.entityId ?? item.id)} className="mw-route-placeholder"><strong>{String(item.status ?? 'UNKNOWN')}</strong><span>{String(item.reference ?? item.entityId ?? item.id ?? '')}</span><span>{String(item.sourceType ?? 'SOURCE')}</span></div>)}{evidence.length===0&&<div className="mw-muted">No evidence records are currently available.</div>}</div></CardContent></Card>
      </div>
    </>}
    {!busy && <div className="mw-muted" data-universe-drilldown-inputs={JSON.stringify({events:events.length,prophets:prophets.length,relations:relations.length,ledger:ledger.length})} />}
    <div className="sr-only" aria-hidden="true">{prophets.length}</div>
  </div>;
}
