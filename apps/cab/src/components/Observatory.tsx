import { useEffect, useState } from 'react';
import { ObservatoryBase } from './ObservatoryBase';
import { UniverseDrilldown } from './UniverseDrilldown';
import { api } from '../lib/api';
import type { Locale } from '../lib/i18n';

export function Observatory({ locale = 'id' }: { locale?: Locale }) {
  const [events, setEvents] = useState<any[]>([]);
  const [prophets, setProphets] = useState<any[]>([]);
  const [graph, setGraph] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    Promise.all([api.entities('KNOWLEDGE.PROPHETIC_EVENT'), api.entities('REVELATION.PROPHET_PROFILE'), api.kernelGraph(), api.kernelLedger()]).then(([ev, p, g, l]) => {
      if (!active) return;
      setEvents(Array.isArray(ev) ? ev : []);
      setProphets(Array.isArray(p) ? p : []);
      setGraph(g ?? null);
      setLedger(Array.isArray(l) ? l.slice(-12).reverse() : []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return <div className="mw-stack"><ObservatoryBase locale={locale}/><UniverseDrilldown events={events} prophets={prophets} relations={Array.isArray(graph?.relations) ? graph.relations : []} ledger={ledger} locale={locale}/></div>;
}
