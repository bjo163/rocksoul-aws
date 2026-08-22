import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { RelationPanel } from './RelationPanel';
import { TimelinePanel } from './TimelinePanel';

export function ModelGraphPanel({graph}: {graph:any}) {
  if(!graph) return <Card><CardContent>No graph loaded.</CardContent></Card>;
  return <div className="mw-stack"><RelationPanel graph={graph}/><TimelinePanel graph={graph}/><Card><CardHeader><CardTitle>Connected Resources</CardTitle></CardHeader><CardContent><div className="mw-kpis"><div><strong>Assets</strong><span>{graph.assets?.length??0}</span></div><div><strong>Resources</strong><span>{graph.resources?.length??0}</span></div><div><strong>Events</strong><span>{(graph.eventsByActor?.length??0)+(graph.eventsBySubject?.length??0)}</span></div></div></CardContent></Card></div>;
}
