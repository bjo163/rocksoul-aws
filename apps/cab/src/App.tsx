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
import { IdentityAccess } from './components/IdentityAccess';

import { CaseWorkflow } from './components/CaseWorkflow';
import uiConfig from './data/ui-config.json';
import { useTranslation } from './lib/i18n';

const menus = uiConfig.menus as readonly string[];
type Menu = string;
const menuDescriptions = uiConfig.menuDescriptions as Record<string, string>;

function AuthScreen({ onAuth, health, locale, theme, onLocaleChange, onThemeChange }: { onAuth: (data: any) => void; health: any; locale: CivicLocale; theme: CivicTheme; onLocaleChange: (locale: CivicLocale) => void; onThemeChange: (theme: CivicTheme) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const text = useTranslation(locale).auth as Record<string, string>;
  const isSetup = health?.needsSetup === true;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (isSetup && password !== confirmPassword) {
      setError(text.passwordMismatch ?? 'Passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = (isSetup
        ? await api.setup({ username, password })
        : await api.login({ username, password })) as { user: unknown; [key: string]: unknown };
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
          <div className="mw-eyebrow">{isSetup ? (text.setupEyebrow ?? 'FIRST-TIME SETUP') : text.eyebrow}</div>
          <CardTitle>{isSetup ? (text.setupTitle ?? 'Create administrator account') : text.title}</CardTitle>
          <p className="mw-muted">{isSetup ? (text.setupHelp ?? 'No accounts exist yet. Create the first administrator to begin.') : text.help}</p>
          <div className="mw-env-row"><Badge>{String(health?.environment ?? text.connecting).toUpperCase()}</Badge><span>{health?.database ?? text.checkingDb}</span></div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="mw-form">
            <label className="mw-field"><span>{text.username}</span><Input aria-label={text.username} autoComplete="username" placeholder={text.username} value={username} onChange={e => setUsername(e.target.value)} required /></label>
            <label className="mw-field"><span>{text.password}</span><Input aria-label={text.password} autoComplete={isSetup ? 'new-password' : 'current-password'} type="password" placeholder={`${text.password} ${text.passwordHint}`} value={password} onChange={e => setPassword(e.target.value)} required minLength={12} /></label>
            {isSetup && <label className="mw-field"><span>{text.confirmPassword ?? 'Confirm password'}</span><Input aria-label={text.confirmPassword ?? 'Confirm password'} autoComplete="new-password" type="password" placeholder={text.confirmPassword ?? 'Confirm password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={12} /></label>}
            {error && <div className="mw-error" role="alert">{error}</div>}
            <Button type="submit" disabled={busy}>{busy ? (isSetup ? (text.setupProcessing ?? 'Creating account…') : text.processing) : (isSetup ? (text.setupSubmit ?? 'Create admin & enter') : text.submit)}</Button>
          </form>
          {!isSetup && <p className="mw-muted mw-auth-toggle">{text.provisioned}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function HomeOverview({ user, health, models, reviews, locale, onAction }: { user?: Record<string, unknown>, health?: Record<string, unknown>, models?: Model[], reviews?: Record<string, unknown>[], locale: CivicLocale, onAction?: (action: string) => void }) {
  const copy = useTranslation(locale).home as Record<string, string>;
  const cards: [string, React.ReactNode, string][] = [
    [copy.identity, (user?.rid as string) ?? copy.noRid, 'ACTOR'],
    [copy.system, health?.ok ? copy.online : copy.degraded, 'HEALTH'],
    [copy.reviews, reviews?.filter((review: Record<string, unknown>) => review.status !== 'DISPOSED').length, 'REVIEW'],
    [copy.registry, models?.length, 'REGISTRY'],
    [copy.runtime, String(health?.environment ?? 'unknown').toUpperCase(), 'RUNTIME'],
    [copy.database, (health?.database as string) ?? copy.local, 'POSTGRES'],
  ];
  const shellText = useTranslation(locale).shell;
  const actionLabels: Record<string, string> = {
    'New Case': shellText.caseWorkflow,
    'Analyze Case': shellText.aiPlayground,
    'Review Queue': shellText.reviewQueue,
    'Open Observatory': shellText.observatory,
    'Open Registry': shellText.registry
  };
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
  const copy = useTranslation(locale).menu;
  return <Card><CardHeader><div className="mw-eyebrow">{copy.governedWorkspace}</div><CardTitle>{menu}</CardTitle></CardHeader><CardContent><p>{description}</p><div className="mw-route-placeholder"><span className="mw-status-dot" /> {copy.status}</div></CardContent></Card>;
}

export default function App() {
  const preferences = useCivicPreferences('id');
  const { locale, theme, setLocale, setTheme } = preferences;
  const shellText = useTranslation(locale).shell;
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
    document.documentElement.lang = preferences.locale;
  }, [preferences.locale]);

  useEffect(() => {
    api.health().then(setHealth).catch((err) => {
      console.error('API_HEALTH_ERROR', err);
      setHealth({ ok: false, environment: 'offline', database: String(err) });
    });
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

  const navLabels: Record<string, string> = { HOME: shellText.home, 'CASE WORKFLOW': shellText.caseWorkflow, 'AI PLAYGROUND': shellText.aiPlayground, 'REVIEW QUEUE': shellText.reviewQueue, OBSERVATORY: shellText.observatory, 'MODEL REGISTRY': shellText.registry };
  const isRegistry = menu === 'MODEL REGISTRY';
  return <CivicShell appCode="CAB" appName="Control & Audit Board" eyebrow={shellText.eyebrow} nav={menus.map(item=>({id:item,label:navLabels[item]??item}))} active={menu} onNavigate={id=>onMenu(id)} identity={user.rid?{rid:user.rid,role:user.roles?.[0]??'OPERATOR',clearance:'CAB SCOPE'}:undefined} theme={preferences.theme} locale={preferences.locale} onThemeChange={preferences.setTheme} onLocaleChange={preferences.setLocale} actions={<><StatusBadge tone={health?.ok?'positive':'danger'}>{health?.ok?'ONLINE':'DEGRADED'}</StatusBadge><StatusBadge tone="info">{String(health?.environment ?? 'unknown')}</StatusBadge><Button type="button" onClick={logout} variant="ghost">{shellText.logout}</Button></>}>
    <div className="mw-cab-stack">
    {!user.rid && <BoundaryNotice>{shellText.ridRequired}</BoundaryNotice>}
    {isRegistry ? <div className="mw-grid">
      <section className="mw-search">
        <div className="mw-search-head"><div><div className="mw-eyebrow">{shellText.modelRegistry}</div><strong>{shellText.searchModels}</strong></div><Badge>{shellText.governedPrivate}</Badge></div>
        <Input aria-label={shellText.searchAria} value={query} onChange={e => setQuery(e.target.value)} placeholder={shellText.searchPlaceholder} />
        <div className="mw-model-groups">{Object.entries(models.reduce((acc: any, m: any) => { const k = m.domain || m.typeId.split('.')[0] || 'SYSTEM'; (acc[k] ??= []).push(m); return acc; }, {} as Record<string, Model[]>)).sort(([a], [b]) => a.localeCompare(b)).map(([domain, items]: any) => <div key={domain} className="mw-model-group"><div className="mw-group-title">{domain}<span>{items.length}</span></div><div className="mw-model-list">{items.map((m: any) => <Button key={m.typeId} className={m.typeId === selectedType ? 'active' : ''} onClick={() => setSelectedType(m.typeId)}>{m.typeId}</Button>)}</div></div>)}</div>
      </section>
      <div className="mw-cab-main">
        {model ? <ModelTable model={model} rows={rows} onSelect={setSelected} onCreate={() => setIsCreating(true)} /> : <MenuOverview menu={menu} locale={preferences.locale} />}
      </div>
      <aside className="mw-side">
        <ModelDetail model={model ?? ({ typeId: `MENU.${menu}`, ui: { typeId: `MENU.${menu}`, title: menu, family: 'SYSTEM', route: '', layout: 'default', sections: [], fields: [], capabilities: { create: false, read: true, update: false, delete: false, relations: false, events: false, audit: false } } } satisfies Model)} row={selected} onEdit={() => setIsEditing(true)} onDelete={handleDelete} />
        {selected && <ModelGraphPanel graph={graph} />}
      </aside>
    </div> : <div className="mw-cab-main">{menu === 'CASE WORKFLOW' ? <CaseWorkflow user={user} locale={preferences.locale} /> : menu === 'AI PLAYGROUND' ? <AiPlayground locale={preferences.locale} canAnalyze={Boolean(user.rid)} /> : menu === 'OBSERVATORY' ? <Observatory locale={preferences.locale} /> : menu === 'REVIEW QUEUE' ? <ReviewQueue reviews={reviews} locale={preferences.locale} /> : menu === 'IDENTITY & ACCESS' ? <IdentityAccess locale={preferences.locale} /> : <HomeOverview user={user} health={health} models={models} reviews={reviews} locale={preferences.locale} onAction={handleQuickAction} />}</div>}
    <footer className="mw-cab-footer">{shellText.footer}</footer>
    {isCreating && model && (
      <Modal title={shellText.createModel.replace('{{model}}', model.ui.title)} onClose={() => setIsCreating(false)}>
        <ModelForm model={model} onSubmit={handleCreateSubmit} onCancel={() => setIsCreating(false)} />
      </Modal>
    )}
    {isEditing && model && selected && (
      <Modal title={shellText.editModel.replace('{{model}}', model.ui.title)} onClose={() => setIsEditing(false)}>
        <ModelForm model={model} initialData={selected} onSubmit={handleUpdateSubmit} onCancel={() => setIsEditing(false)} />
      </Modal>
    )}
    </div>
  </CivicShell>;
}
