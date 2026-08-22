import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, clearAuth, getToken, saveAuth } from './lib/api';
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
import uiConfig from './data/ui-config.json';

const menus = uiConfig.menus as readonly string[];
type Menu = string;
const menuDescriptions = uiConfig.menuDescriptions as Record<string, string>;

type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('moonwitness.theme');
  return stored === 'light' ? 'light' : 'dark';
}

function AuthScreen({ onAuth }: { onAuth: (data: any) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rid, setRid] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data: any = mode === 'login'
        ? await api.login({ username, password })
        : await api.register({ username, password, rid });
      if (mode === 'register') {
        const login: any = await api.login({ username, password });
        saveAuth(login);
        onAuth(login.user);
      } else {
        saveAuth(data);
        onAuth(data.user);
      }
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
      <Card className="mw-auth-card">
        <CardHeader>
          <div className="mw-brand-mark"><span className="mw-brand-dot" /> MOONWITNESS</div>
          <div className="mw-eyebrow">REAL-WORLD PERSONAL OS</div>
          <CardTitle>{mode === 'login' ? 'Welcome back' : 'Create your account'}</CardTitle>
          <p className="mw-muted">Private-first workspace · local-first · real world</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="mw-form">
            <label className="mw-field"><span>Username</span><Input aria-label="Username" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required /></label>
            <label className="mw-field"><span>Password</span><Input aria-label="Password" type="password" placeholder="Password (min 8)" value={password} onChange={e => setPassword(e.target.value)} required /></label>
            {mode === 'register' && <label className="mw-field"><span>RID</span><Input aria-label="RID" placeholder="RID" value={rid} onChange={e => setRid(e.target.value)} /></label>}
            {error && <div className="mw-error" role="alert">{error}</div>}
            <Button type="submit" disabled={busy}>{busy ? 'Processing…' : mode === 'login' ? 'Enter MoonWitness' : 'Create account'}</Button>
          </form>
          <Button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} variant="ghost" className="mw-auth-toggle">
            {mode === 'login' ? 'Create new account' : 'Back to login'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function HomeOverview({ user, health, models, onAction }: any) {
  const cards = [
    ['Identity', user?.rid ?? 'No RID', 'ACTOR'],
    ['System', health?.ok ? 'Online' : 'Degraded', 'HEALTH'],
    ['Models', models.length, 'REGISTRY'],
    ['Mode', 'REAL', 'WORLD'],
    ['Visibility', 'PRIVATE', 'DEFAULT'],
    ['XP', '—', 'PROGRESS'],
  ];
  return <div className="mw-stack">
    <div className="mw-hero-panel">
      <div><div className="mw-eyebrow">PERSONAL COMMAND CENTER</div><h2>Operate reality. Keep the trail.</h2><p>One input, one result — the kernel handles provenance, scoring, relations and audit behind the scenes.</p></div>
      <div className="mw-orb" aria-hidden="true"><span /></div>
    </div>
    <div className="mw-kpis mw-kpis-6">{cards.map(([title, value, meta]) => <div key={title} className="mw-kpi"><strong>{meta}</strong><span className="mw-kpi-title">{title}</span><b>{value}</b></div>)}</div>
    <Card><CardHeader><CardTitle>Quick actions</CardTitle></CardHeader><CardContent><div className="mw-action-grid">
      {uiConfig.quickActions.map(action => <Button key={action} className="mw-action-tile" onClick={() => onAction && onAction(action)}>{action}</Button>)}
    </div></CardContent></Card>
  </div>;
}

function MenuOverview({ menu }: { menu: Menu }) {
  const description = menuDescriptions[menu] ?? 'Ready.';
  return <Card><CardHeader><div className="mw-eyebrow">WORKSPACE</div><CardTitle>{menu}</CardTitle></CardHeader><CardContent><p>{description}</p><div className="mw-route-placeholder"><span className="mw-status-dot" /> Ready · REAL mode · PRIVATE</div></CardContent></Card>;
}

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [menu, setMenu] = useState<Menu>('HOME');
  const [models, setModels] = useState<Model[]>([]);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [graph, setGraph] = useState<any>(null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
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
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('moonwitness.theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!getToken()) return;
    api.me().then(setUser).catch(() => { clearAuth(); setUser(null); });
  }, []);

  useEffect(() => {
    if (!user) return;
    api.health().then(setHealth).catch(() => setHealth({ ok: false }));
    api.models(query).then(setModels).catch(() => setModels([]));
  }, [user, query]);

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

  if (!user) return <AuthScreen onAuth={u => setUser(u)} />;

  const logout = async () => { try { await api.logout(); } finally { clearAuth(); setUser(null); } };
  
  const onMenu = (next: Menu) => { 
    setMenu(next); 
    setSelected(null); 
    setRows([]); 
    
    const targetMap: Record<string, string> = {
      CAB: 'cab',
      PROJECTS: 'project',
      HEROES: 'prophet',
      ASMA: 'asma',
      'MĪZĀN': 'mizan',
      AUDIT: 'audit',
      KNOWLEDGE: 'knowledge',
      RESOURCES: 'resource',
      LIFE: 'life',
      SHADOW: 'shadow',
      MISSIONS: 'mission'
    };
    const term = targetMap[next as string];
    if (term) {
      const found = models.find((m: Model) => m.typeId.toLowerCase().includes(term));
      if (found) {
        setSelectedType(found.typeId);
        return;
      }
    }
    setSelectedType(''); 
  };

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'New CAB': {
        const cabModel = models.find((m: Model) => m.typeId.toLowerCase().includes('cab'));
        if (cabModel) {
          onMenu('CAB');
          setSelectedType(cabModel.typeId);
          setTimeout(() => setIsCreating(true), 10);
        } else {
          alert('CAB model not found');
        }
        break;
      }
      case 'Simulate AI': onMenu('AI PLAYGROUND'); break;
      case 'Verify Knowledge': onMenu('KNOWLEDGE'); break;
      case 'Open Projects': onMenu('PROJECTS'); break;
      case 'Review Asma': onMenu('ASMA'); break;
      case 'Open Mīzān': onMenu('MĪZĀN'); break;
      case 'Open Audit': onMenu('AUDIT'); break;
    }
  };

  return <div className="mw-shell">
    <div className="mw-stars" aria-hidden="true" />
    <header className="mw-header">
      <div className="mw-brand-lockup"><div className="mw-brand-mark"><span className="mw-brand-dot" /> MOONWITNESS</div><h1>Control & Audit Board</h1><div className="mw-user">{user.username} · {user.rid ?? 'NO-RID'} · <span>CAB / OPERATOR</span></div></div>
      <div className="mw-actions"><Badge>{health?.ok ? 'ONLINE' : 'DEGRADED'}</Badge><Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} variant="ghost" aria-label="Toggle theme">{theme === 'dark' ? '☀ Light' : '☾ Dark'}</Button><Button onClick={logout} variant="ghost">Logout</Button></div>
    </header>
    <nav className="mw-nav" aria-label="Main navigation">
      {menus.map(m => <Button key={m} className={menu === m ? 'active' : ''} variant={menu === m ? 'default' : 'ghost'} onClick={() => onMenu(m)}>{m}</Button>)}
    </nav>
    <main className="mw-grid">
      <section className="mw-search">
        <div className="mw-search-head"><div><div className="mw-eyebrow">UNIVERSAL SEARCH</div><strong>Search any model or knowledge surface</strong></div><Badge>REAL · PRIVATE</Badge></div>
        <Input aria-label="Universal search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search CAB, project, claim, asset, Asma, Mīzān…" />
        <div className="mw-model-groups">{Object.entries(models.reduce((acc: any, m: any) => { const k = m.domain || m.typeId.split('.')[0] || 'SYSTEM'; (acc[k] ??= []).push(m); return acc; }, {} as Record<string, Model[]>)).sort(([a], [b]) => a.localeCompare(b)).map(([domain, items]: any) => <div key={domain} className="mw-model-group"><div className="mw-group-title">{domain}<span>{items.length}</span></div><div className="mw-model-list">{items.map((m: any) => <Button key={m.typeId} className={m.typeId === selectedType ? 'active' : ''} onClick={() => setSelectedType(m.typeId)}>{m.typeId}</Button>)}</div></div>)}</div>
      </section>
      <div className="mw-main">
        {menu === 'AI PLAYGROUND' ? <AiPlayground /> : menu === 'OBSERVATORY' ? <Observatory /> : menu === 'REVIEW QUEUE' ? <ReviewQueue /> : menu === 'HOME' && !model ? <HomeOverview user={user} health={health} models={models} onAction={handleQuickAction} /> : model ? <ModelTable model={model} rows={rows} onSelect={setSelected} onCreate={() => setIsCreating(true)} /> : <MenuOverview menu={menu} />}
      </div>
      <aside className="mw-side">
        <ModelDetail model={model ?? ({ typeId: `MENU.${menu}`, ui: { typeId: `MENU.${menu}`, title: menu, family: 'SYSTEM', route: '', layout: 'default', sections: [], fields: [], capabilities: { create: false, read: true, update: false, delete: false, relations: false, events: false, audit: false } } } satisfies Model)} row={selected} onEdit={() => setIsEditing(true)} onDelete={handleDelete} />
        {selected && <ModelGraphPanel graph={graph} />}
      </aside>
    </main>
    <footer className="mw-footer">REAL · R / G / B / L · Asma · Mīzān · XP · Audit · Local-first</footer>
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
  </div>;
}
