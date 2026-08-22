import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { RelationPanel } from './RelationPanel';
import { TimelinePanel } from './TimelinePanel';
import { useTranslation } from '../../lib/i18n';
import { useCivicPreferences } from '@moonwitness/ui';

export function ModelGraphPanel({graph}: {graph:any|null}) {
  const { locale } = useCivicPreferences('id');
  const copy = useTranslation(locale).model;
  if(!graph) return <Card><CardContent>{copy.noGraph}</CardContent></Card>;
  return <div className="mw-stack"><RelationPanel graph={graph}/><TimelinePanel graph={graph}/><Card><CardHeader><CardTitle>{copy.connectedResources}</CardTitle></CardHeader><CardContent><div className="mw-kpis"><div><strong>{copy.assets}</strong><span>{graph.assets?.length??0}</span></div><div><strong>{copy.resources}</strong><span>{graph.resources?.length??0}</span></div><div><strong>{copy.events}</strong><span>{(graph.eventsByActor?.length??0)+(graph.eventsBySubject?.length??0)}</span></div></div></CardContent></Card></div>;
}
