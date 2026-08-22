import type { Model } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function ModelTable({model, rows, onSelect, onCreate}: {model: Model; rows: any[]; onSelect: (row:any)=>void; onCreate?: () => void}) {
  return <Card><CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><CardTitle>{model.ui.title}</CardTitle></div>{model.ui.capabilities?.create && onCreate && <Button onClick={onCreate} variant="default" style={{ padding: '4px 12px', fontSize: '12px' }}>+ Add New</Button>}</CardHeader><CardContent><div className="mw-table-wrap"><table className="mw-table"><thead><tr>{model.ui.fields.map(f=><th scope="col" key={f.name}>{f.label}</th>)}</tr></thead><tbody>{rows.map((row, i)=><tr key={row.entityId ?? row.id ?? i} tabIndex={0} aria-label={`Open ${model.ui.title} record ${i + 1}`} onClick={()=>onSelect(row)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(row);}}}>{model.ui.fields.map(f=>{const value = f.path.split('.').reduce((a,k)=>a?.[k], row); return <td key={f.name}>{f.kind==='badge'?<Badge>{String(value ?? '—')}</Badge>:String(value ?? '—')}</td>})}</tr>)}</tbody></table></div></CardContent></Card>
}
