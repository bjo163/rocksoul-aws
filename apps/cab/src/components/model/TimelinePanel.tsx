import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useTranslation } from '../../lib/i18n';
import { useCivicPreferences } from '@moonwitness/ui';

export function TimelinePanel({graph}: {graph:any}) {
  const { locale } = useCivicPreferences('id');
  const copy = useTranslation(locale).model;
  const events=[...(graph?.eventsByActor??[]),...(graph?.eventsBySubject??[])].sort((a,b)=>String(b.time).localeCompare(String(a.time)));
  return <Card><CardHeader><CardTitle>{copy.timeline}</CardTitle></CardHeader><CardContent>{events.length?events.map((e:any)=><div key={e.eventId} className="mw-timeline-item"><span className="mw-dot"/><div className="mw-timeline-content"><b>{e.type}</b><div className="mw-muted">{e.time}</div></div></div>):<div className="mw-muted">{copy.noEvents}</div>}</CardContent></Card>;
}
