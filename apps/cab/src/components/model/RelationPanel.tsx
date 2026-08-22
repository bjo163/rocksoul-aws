import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export function RelationPanel({graph}: {graph:any}) {
  const outgoing = graph?.outgoing ?? [];
  const incoming = graph?.incoming ?? [];
  return <Card><CardHeader><CardTitle>Relations</CardTitle></CardHeader><CardContent><div className="mw-relations"><div><div className="mw-muted">Outgoing</div>{outgoing.length?outgoing.map((r:any)=><div key={r.relationId} className="mw-rel"><b>{r.type}</b><span>→ {r.to}</span></div>):<div className="mw-muted">None</div>}</div><div><div className="mw-muted">Incoming</div>{incoming.length?incoming.map((r:any)=><div key={r.relationId} className="mw-rel"><b>{r.type}</b><span>← {r.from}</span></div>):<div className="mw-muted">None</div>}</div></div></CardContent></Card>;
}
