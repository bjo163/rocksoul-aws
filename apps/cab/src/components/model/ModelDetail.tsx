import type { Model } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function ModelDetail({model, row, onEdit, onDelete}: {model: Model; row:any|null; onEdit?: ()=>void; onDelete?: ()=>void}) {
  if(!row) return <Card><CardContent>No entity selected.</CardContent></Card>;
  return <Card><CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><div><CardTitle>{model.ui.title} · Detail</CardTitle></div><div style={{ display: 'flex', gap: '8px' }}>{model.ui.capabilities?.update && onEdit && <Button variant="ghost" onClick={onEdit} style={{ padding: '2px 8px', fontSize: '11px' }}>Edit</Button>}{model.ui.capabilities?.delete && onDelete && <Button variant="ghost" onClick={onDelete} style={{ padding: '2px 8px', fontSize: '11px', color: '#fb7185' }}>Delete</Button>}</div></CardHeader><CardContent><div className="mw-detail-grid">{model.ui.fields.map(f=>{const value=f.path.split('.').reduce((a,k)=>a?.[k],row); return <div key={f.name} className="mw-detail-item"><div className="mw-muted">{f.label}</div><div>{f.kind==='badge'?<Badge>{String(value ?? '—')}</Badge>:String(value ?? '—')}</div></div>})}</div></CardContent></Card>;
}
