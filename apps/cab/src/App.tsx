import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BoundaryNotice, CivicShell, PreferenceControls, StatusBadge, useCivicPreferences, type CivicLocale, type CivicTheme } from '@moonwitness/ui';
import { api, clearAuth, hasStoredSession, saveAuth } from './lib/api';
import type { Model } from './types';
import { Input } from './components/ui/Input';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { ModelTable } from './components/model/ModelTable';
import { ModelDetail } from './components/model/ModelDetail';
import { ModelGraphPanel } from './components/model/ModelGraphPanel';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/Card';
import { Modal } from './components/ui/Modal';
import { ModelForm } from './components/model/ModelForm';
import { AiPlayground } from './components/AiPlayground';
import { Observatory } from './components/Observatory';
import { ReviewQueue } from './components/ReviewQueue';
import { CaseWorkflow } from './components/CaseWorkflow';
import uiConfig from './data/ui-config.json';

const menus = uiConfig.menus as readonly string[];
type Menu = string;
const menuDescriptions = uiConfig.menuDescriptions as Record<string, string>;

function AuthScreen({ onAuth, health, locale, theme, onLocaleChange, onThemeChange }: { onAuth: (data: any) => void; health: any; locale: CivicLocale; theme: CivicTheme; onLocaleChange: (locale: CivicLocale) => void; onThemeChange: (theme: CivicTheme) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const text = locale === 'id' ? { eyebrow: 'KONSOL TATA KELOLA PRIVAT', title: 'Akses operator terkelola', help: 'Hanya akun yang telah disediakan · peran dan lingkup RID eksplisit', username: 'Nama pengguna', password: 'Kata sandi', submit: 'Masuk CAB', processing: 'Memproses…', provisioned: 'Akses disediakan oleh administrator berwenang. Pengguna publik masuk melalui XRP.' } : { eyebrow: 'PRIVATE GOVERNANCE CONSOLE', title: 'Governed operator access', help: 'Provisioned accounts only · explicit role and RID scope', username: 'Username', password: 'Password', submit: 'Enter CAB', processing: 'Processing…', provisioned: 'Access is provisioned by an authorized administrator. Public users sign in through XRP.' };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data: any = await api.login({ username, password });
      saveAuth(data);
      onAuth(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AUTH_ERROR');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mw-auth">
      <div className="mw-auth-orbit mw-orbit-a" />
      <div className="mw-auth-orbit mw-orbit-b" />
      <div className="mw-auth-preferences"><PreferenceControls theme={theme} locale={locale} onThemeChange={onThemeChange} onLocaleChange={onLocaleChange} /></div>
      <Card className="mw-auth-card">
        <CardHeader>
          <div className="mw-brand-mark"><span className="mw-brand-dot" /> MOONWITNESS</div>
          <div className="mw-eyebrow">{text.eyebrow}</div>
          <CardTitle>{text.title}</CardTitle>
          <p className="mw-muted">{text.help}</p>
          <div className="mw-env-row"><Badge>{String(health?.environment ?? 'connecting').toUpperCase()}</Badge><span>{health?.database ?? 'Checking database…'}</span></div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="mw-form">
            <label className="mw-field"><span>{text.username}</span><Input aria-label={text.username} autoComplete="username" placeholder={text.username} value={username} onChange={e => setUsername(e.target.value)} required /></label>
            <label className="mw-field"><span>{text.password}</span><Input aria-label={text.password} autoComplete="current-password" type="password" placeholder={`${text.password} (min 12)`} value={password} onChange={e => setPassword(e.target.value)} required minLength={12} /></label>
            {error && <div className="mw-error" role="alert">{error}</div>}
            <Button type="submit" disabled={busy}>{busy ? text.processing : text.submit}</Button>
          </form>
          <p className="mw-muted mw-auth-toggle">{text.provisioned}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function HomeOverview({ user, health, models, reviews, locale, onAction }: any) {
  const copy = locale === 'id'
    ? { eyebrow: 'OPERASI TATA KELOLA', title: 'Bukti terjaga. Keputusan dapat ditelusuri.', text: 'Mulai dari kasus, bukan asumsi. Setiap tindakan terkelola menyimpan konteks, batas kewenangan, Witness, dan audit.', actions: 'Aksi operasional', identity: 'Identitas', system: 'Sistem', reviews: 'Review terbuka', registry: 'Registry model', runtime: 'Lingkungan', database: 'Database' }
    : { eyebrow: 'GOVERNED OPERATIONS', title: 'Evidence preserved. Decisions traceable.', text: 'Start from a case, not an assumption. Every governed action preserves context, authority boundaries, Witness, and audit.', actions: 'Operational actions', identity: 'Identity', system: 'System', reviews: 'Open reviews', registry: 'Model registry', runtime: 'Environment', database: 'Database' };
  const cards = [
    [copy.identity, user?.rid ?? 'NO RID', 'ACTOR'],
    [copy.system, health?.ok ? 'ONLINE' : 'DEGRADED', 'HEALTH'],
    [copy.reviews, reviews.filter((review: any) => review.status !== 'DISPOSED').length, 'REVIEW'],
    [copy.registry, models.length, 'REGISTRY'],
    [copy.runtime, String(health?.environment ?? 'unknown').toUpperCase(), 'RUNTIME'],
    [copy.database, health?.database ?? 'Local', 'POSTGRES'],
  ];
  const actionLabels: Record<string, string> = locale === 'id'
    ? { 'New Case': 'Kasus baru', 'Analyze Case': 'Analisis kasus', 'Review Queue': 'Antrean review', 'Open Observatory': 'Buka observatorium', 'Open Registry': 'Buka registry' }
    : { 'New Case': 'New case', 'Analyze Case': 'Analyze case', 'Review Queue': 'Review queue', 'Open Observatory': 'Open observatory', 'Open Registry': 'Open registry' };
  return <div className="mw-stack">
    <div className="mw-hero-panel">
      <div><div className="mw-eyebrow">{copy.eyebrow}</div><h2>{copy.title}</h2><p>{copy.text}</p></div>
      <div className="mw-orb" aria-hidden="true"><span /></div>
    </div>
    <div className="mw-kpis mw-kpis-6">{cards.map(([title, value, meta]) => <div key={title} className="mw-kpi"><strong>{meta}</strong><span className="mw-kpi-title">{title}</span><b>{value}</b></div>)}</div>
    <Card><CardHeader><CardTitle>{copy.actions}</CardTitle></CardHeader><CardContent><div className="mw-action-grid">
      {uiConfig.quickActions.map(action => <Button key={action} className="mw-action-tile" onClick={() => onAction && onAction(action)}>{actionLabels[action] ?? action}</Button>)}
    </div></CardContent></Card>
  </div>;
}

function MenuOverview({ menu, locale }: { menu: Menu; locale: CivicLocale }) {
  const description = menuDescriptions[menu] ?? 'Ready.';
  const status = locale === 'id' ? 'Pilih tipe model untuk diperiksa.' : 'Choose a model type to inspect.';
  return <Card><CardHeader><div className="mw-eyebrow">{locale === 'id' ? 'RUANG KERJA TERKELOLA' : 'GOVERNED WORKSPACE'}</div><CardTitle>{menu}</CardTitle></CardHeader><CardContent><p>{description}</p><div className="mw-route-placeholder"><span className="mw-status-dot" /> {status}</div></CardContent></Card>;
}

export default function App() {
  const preferences = useCivicPreferences('id');
  const [user, setUser] = useState<any | null>(null);
  const [menu, setMenu] = useState<Menu>('HOME');
  const [models, setModels] = useState<Model[]>([]);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [graph, setGraph] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCreateSubmit = async (data: any) => {
    if (!model) return;
    try {
      await api.createEntity(model.typeId, data);
      setIsCreating(false);
      const newRows = await api.entities(model.typeId);
      setRows(newRows);
    } catch (err) {
      console.error('Failed to create entity', err);
      alert('Failed to create entity');
    }
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selected) return;
    try {
      const id = selected.entityId ?? selected.id;
      await api.updateEntity(id, data);
      setIsEditing(false);
      if (model) {
        const newRows = await api.entities(model.typeId);
        setRows(newRows);
        const updatedRow = newRows.find((r: any) => (r.entityId ?? r.id) === id);
        if (updatedRow) setSelected(updatedRow);
      }
    } catch (err) {
      console.error('Failed to update entity', err);
      alert('Failed to update entity');
    }
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm('Are you sure you want to delete this?')) return;
    try {
      const id = selected.entityId ?? selected.id;
      await api.deleteEntity(id);
      setSelected(null);
      if (model) {
        const newRows = await api.entities(model.typeId);
        setRows(newRows);
      }
    } catch (err) {
      console.error('Failed to delete entity', err);
      alert('Failed to delete entity');
    }
  };

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ ok: false, environment: 'offline' }));
  }, []);

  useEffect(() => {
    if (!hasStoredSession()) return;
    api.me().then(setUser).catch(() => { clearAuth(); setUser(null); });
  }, []);

  useEffect(() => {
    if (!user) return;
    api.models(query).then(setModels).catch(() => setModels([]));
  }, [user, query]);

  useEffect(() => {
    if (!user) { setReviews([]); return; }
    api.reviews().then(data => setReviews((data.reviews ?? []).map((item: any) => item.payload ?? item))).catch(() => setReviews([]));
  }, [user]);

  const model = useMemo(() => models.find((m: Model) => m.typeId === selectedType) ?? null, [models, selectedType]);

  useEffect(() => {
    if (!user) return;
    if (selectedType) {
      api.entities(selectedType, query).then(setRows).catch(() => setRows([]));
    } else {
      setRows([]);
      setSelected(null);
      setGraph(null);
    }
  }, [selectedType, user, query]);

  useEffect(() => {
    if (!selected?.entityId) { setGraph(null); return; }
    api.graph(selected.entityId).then(setGraph).catch(() => setGraph(null));
  }, [selected]);

  if (!user) return <AuthScreen health={health} onAuth={u => setUser(u)} locale={preferences.locale} theme={preferences.theme} onLocaleChange={preferences.setLocale} onThemeChange={preferences.setTheme} />;

  const logout = async () => { try { await api.logout(); } finally { clearAuth(); setUser(null); } };
  
  const onMenu = (next: Menu) => { setMenu(next); setSelected(null); setRows([]); if (next !== 'MODEL REGISTRY') setSelectedType(''); };

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'New Case': onMenu('CASE WORKFLOW'); break;
      case 'Analyze Case': onMenu('AI PLAYGROUND'); break;
      case 'Review Queue': onMenu('REVIEW QUEUE'); break;
      case 'Open Observatory': onMenu('OBSERVATORY'); break;
      case 'Open Registry': onMenu('MODEL REGISTRY'); break;
    }
  };

  const navLabels: Record<string, string> = preferences.locale === 'id'
    ? { HOME: 'Ringkasan', 'CASE WORKFLOW': 'Alur Kasus', 'AI PLAYGROUND': 'Analisis', 'REVIEW QUEUE': 'Antrean Review', OBSERVATORY: 'Observatorium', 'MODEL REGISTRY': 'Registry Model' }
    : { HOME: 'Overview', 'CASE WORKFLOW': 'Case workflow', 'AI PLAYGROUND': 'Analysis', 'REVIEW QUEUE': 'Review queue', OBSERVATORY: 'Observatory', 'MODEL REGISTRY': 'Model registry' };
  const isRegistry = menu === 'MODEL REGISTRY';
  return <CivicShell appCode="CAB" appName="Control & Audit Board" eyebrow={preferences.locale === 'id' ? 'KONSOL OPERATOR · OTORITAS TERBATAS' : 'OPERATOR CONSOLE · LIMITED AUTHORITY'} nav={menus.map(item=>({id:item,label:navLabels[item]??item}))} active={menu} onNavigate={id=>onMenu(id)} identity={user.rid?{rid:user.rid,role:user.roles?.[0]??'OPERATOR',clearance:'CAB SCOPE'}:undefined} theme={preferences.theme} locale={preferences.locale} onThemeChange={preferences.setTheme} onLocaleChange={preferences.setLocale} actions={<><StatusBadge tone={health?.ok?'positive':'danger'}>{health?.ok?'ONLINE':'DEGRADED'}</StatusBadge><StatusBadge tone="info">{String(health?.environment ?? 'unknown')}</StatusBadge><Button type="button" onClick={logout} variant="ghost">{preferences.locale==='id'?'Keluar':'Logout'}</Button></>}>
    <div className="mw-cab-stack">
    {!user.rid && <BoundaryNotice>{preferences.locale === 'id' ? 'RID DIPERLUKAN · Aksi tata kelola memerlukan RID operator yang terikat secara eksplisit.' : 'RID REQUIRED · Governed action requires an explicitly bound operator RID.'}</BoundaryNotice>}
    {isRegistry ? <div className="mw-grid">
      <section className="mw-search">
        <div className="mw-search-head"><div><div className="mw-eyebrow">{preferences.locale === 'id' ? 'REGISTRY MODEL' : 'MODEL REGISTRY'}</div><strong>{preferences.locale === 'id' ? 'Cari tipe data dan kemampuan yang tersedia' : 'Search available model types and capabilities'}</strong></div><Badge>{preferences.locale === 'id' ? 'TERKELOLA · PRIVAT' : 'GOVERNED · PRIVATE'}</Badge></div>
        <Input aria-label="Universal search" value={query} onChange={e => setQuery(e.target.value)} placeholder={preferences.locale === 'id' ? 'Cari kasus, bukti, sumber, atau model…' : 'Search cases, evidence, sources, or models…'} />
        <div className="mw-model-groups">{Object.entries(models.reduce((acc: any, m: any) => { const k = m.domain || m.typeId.split('.')[0] || 'SYSTEM'; (acc[k] ??= []).push(m); return acc; }, {} as Record<string, Model[]>)).sort(([a], [b]) => a.localeCompare(b)).map(([domain, items]: any) => <div key={domain} className="mw-model-group"><div className="mw-group-title">{domain}<span>{items.length}</span></div><div className="mw-model-list">{items.map((m: any) => <Button key={m.typeId} className={m.typeId === selectedType ? 'active' : ''} onClick={() => setSelectedType(m.typeId)}>{m.typeId}</Button>)}</div></div>)}</div>
      </section>
      <div className="mw-cab-main">
        {model ? <ModelTable model={model} rows={rows} onSelect={setSelected} onCreate={() => setIsCreating(true)} /> : <MenuOverview menu={menu} locale={preferences.locale} />}
      </div>
      <aside className="mw-side">
        <ModelDetail model={model ?? ({ typeId: `MENU.${menu}`, ui: { typeId: `MENU.${menu}`, title: menu, family: 'SYSTEM', route: '', layout: 'default', sections: [], fields: [], capabilities: { create: false, read: true, update: false, delete: false, relations: false, events: false, audit: false } } } satisfies Model)} row={selected} onEdit={() => setIsEditing(true)} onDelete={handleDelete} />
        {selected && <ModelGraphPanel graph={graph} />}
      </aside>
    </div> : <div className="mw-cab-main">{menu === 'CASE WORKFLOW' ? <CaseWorkflow user={user} locale={preferences.locale} /> : menu === 'AI PLAYGROUND' ? <AiPlayground locale={preferences.locale} canAnalyze={Boolean(user.rid)} /> : menu === 'OBSERVATORY' ? <Observatory locale={preferences.locale} /> : menu === 'REVIEW QUEUE' ? <ReviewQueue user={user} locale={preferences.locale} onChanged={() => api.reviews().then(data => setReviews((data.reviews ?? []).map((item: any) => item.payload ?? item))).catch(() => undefined)} /> : <HomeOverview user={user} health={health} models={models} reviews={reviews} locale={preferences.locale} onAction={handleQuickAction} />}</div>}
    <footer className="mw-cab-footer">{preferences.locale === 'id' ? 'TERKELOLA · Bukti · Review manusia · Witness · Audit' : 'GOVERNED · Evidence · Human review · Witness · Audit'}</footer>
    {isCreating && model && (
      <Modal title={`Create ${model.ui.title}`} onClose={() => setIsCreating(false)}>
        <ModelForm model={model} onSubmit={handleCreateSubmit} onCancel={() => setIsCreating(false)} />
      </Modal>
    )}
    {isEditing && model && selected && (
      <Modal title={`Edit ${model.ui.title}`} onClose={() => setIsEditing(false)}>
        <ModelForm model={model} initialData={selected} onSubmit={handleUpdateSubmit} onCancel={() => setIsEditing(false)} />
      </Modal>
    )}
    </div>
  </CivicShell>;
}
