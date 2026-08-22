import type { Model } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useTranslation } from '../../lib/i18n';
import { useCivicPreferences } from '@moonwitness/ui';

export function ModelDetail({model, row, onEdit, onDelete}: {model: Model; row:any|null; onEdit?: ()=>void; onDelete?: ()=>void}) {
  const { locale } = useCivicPreferences('id');
  const copy = useTranslation(locale).model;
  if(!row) return <Card><CardContent>{copy.noEntity}</CardContent></Card>;
  return <Card><CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><div><CardTitle>{model.ui.title} · {copy.detail}</CardTitle></div><div style={{ display: 'flex', gap: '8px' }}>{model.ui.capabilities?.update && onEdit && <Button variant="ghost" onClick={onEdit} style={{ padding: '2px 8px', fontSize: '11px' }}>{copy.edit}</Button>}{model.ui.capabilities?.delete && onDelete && <Button variant="ghost" onClick={onDelete} style={{ padding: '2px 8px', fontSize: '11px', color: '#fb7185' }}>{copy.delete}</Button>}</div></CardHeader><CardContent><div className="mw-detail-grid">{model.ui.fields.map(f=>{const value=f.path.split('.').reduce((a,k)=>a?.[k],row); return <div key={f.name} className="mw-detail-item"><div className="mw-muted">{f.label}</div><div>{f.kind==='badge'?<Badge>{String(value ?? '—')}</Badge>:String(value ?? '—')}</div></div>})}</div></CardContent></Card>;
}
