import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useTranslation } from '../../lib/i18n';
import { useCivicPreferences } from '@moonwitness/ui';

export function RelationPanel({graph}: {graph:any}) {
  const { locale } = useCivicPreferences('id');
  const copy = useTranslation(locale).model;
  const outgoing = graph?.outgoing ?? [];
  const incoming = graph?.incoming ?? [];
  return <Card><CardHeader><CardTitle>{copy.relations}</CardTitle></CardHeader><CardContent><div className="mw-relations"><div><div className="mw-muted">{copy.outgoing}</div>{outgoing.length?outgoing.map((r:any)=><div key={r.relationId} className="mw-rel"><b>{r.type}</b><span>→ {r.to}</span></div>):<div className="mw-muted">{copy.none}</div>}</div><div><div className="mw-muted">{copy.incoming}</div>{incoming.length?incoming.map((r:any)=><div key={r.relationId} className="mw-rel"><b>{r.type}</b><span>← {r.from}</span></div>):<div className="mw-muted">{copy.none}</div>}</div></div></CardContent></Card>;
}
