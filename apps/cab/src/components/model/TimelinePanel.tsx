import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export function TimelinePanel({graph}: {graph:any}) {
  const events=[...(graph?.eventsByActor??[]),...(graph?.eventsBySubject??[])].sort((a,b)=>String(b.time).localeCompare(String(a.time)));
  return <Card><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent>{events.length?events.map((e:any)=><div key={e.eventId} className="mw-timeline-item"><span className="mw-dot"/><div><b>{e.type}</b><div className="mw-muted">{e.time}</div></div></div>):<div className="mw-muted">No events</div>}</CardContent></Card>;
}
