import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';

export type CivicTheme = 'solar' | 'lunar';
export type CivicLocale = 'id' | 'en';
export type CivicTone = 'neutral' | 'positive' | 'warning' | 'danger' | 'info' | 'provisional';
export interface CivicNavItem { id: string; label: string; shortLabel?: string; marker?: string }
export interface CivicIdentity { rid: string; displayName?: string; role?: string; clearance?: string }
export interface CivicPublicNavItem { href: string; label: string }

export function useCivicPreferences(defaultLocale: CivicLocale = 'id') {
  const [theme, setTheme] = useState<CivicTheme>('lunar');
  const [locale, setLocale] = useState<CivicLocale>(defaultLocale);
  useEffect(() => {
    const storedTheme = localStorage.getItem('mw.theme');
    const storedLocale = localStorage.getItem('mw.locale');
    if (storedTheme === 'solar' || storedTheme === 'lunar') setTheme(storedTheme);
    if (storedLocale === 'id' || storedLocale === 'en') setLocale(storedLocale);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.mwTheme = theme;
    document.documentElement.lang = locale;
    localStorage.setItem('mw.theme', theme);
    localStorage.setItem('mw.locale', locale);
  }, [theme, locale]);
  return { theme, setTheme, locale, setLocale };
}

export function StatusBadge({ tone = 'neutral', children }: PropsWithChildren<{ tone?: CivicTone }>) { return <span className={`mw-status mw-status-${tone}`}>{children}</span>; }
export function BoundaryNotice({ children, tone = 'warning' }: PropsWithChildren<{ tone?: CivicTone }>) { return <div className={`mw-boundary mw-boundary-${tone}`} role="note"><span aria-hidden="true">◇</span>{children}</div>; }
export function IdentityPlate({ identity }: { identity: CivicIdentity }) { return <div className="mw-identity" aria-label={`RID ${identity.rid}`}><span className="mw-identity-orbit" aria-hidden="true"/><span><small>RID</small><strong>{identity.rid}</strong></span>{(identity.role || identity.clearance) && <span className="mw-identity-meta">{identity.role}{identity.role && identity.clearance ? ' · ' : ''}{identity.clearance}</span>}</div>; }

export function PreferenceControls({ theme, locale, onThemeChange, onLocaleChange }: { theme: CivicTheme; locale: CivicLocale; onThemeChange: (theme: CivicTheme) => void; onLocaleChange: (locale: CivicLocale) => void }) {
  return <div className="mw-preferences"><div className="mw-segment" aria-label="Language"><button type="button" className={locale==='id'?'is-active':''} aria-pressed={locale==='id'} onClick={()=>onLocaleChange('id')}>ID</button><button type="button" className={locale==='en'?'is-active':''} aria-pressed={locale==='en'} onClick={()=>onLocaleChange('en')}>EN</button></div><button className="mw-icon-button" type="button" onClick={()=>onThemeChange(theme==='lunar'?'solar':'lunar')} aria-label={theme==='lunar'?'Use light theme':'Use dark theme'} aria-pressed={theme==='solar'}>{theme==='lunar'?'☼':'◐'}</button></div>;
}

export function CivicPublicHeader({ nav, theme, locale, onThemeChange, onLocaleChange, homeLabel = 'MoonWitness OS home' }: { nav: CivicPublicNavItem[]; theme: CivicTheme; locale: CivicLocale; onThemeChange: (theme: CivicTheme) => void; onLocaleChange: (locale: CivicLocale) => void; homeLabel?: string }) {
  return <header className="mw-public-header"><a className="mw-public-brand" href="#top" aria-label={homeLabel}><span className="mw-sigil" aria-hidden="true">MW</span><span><strong>MOONWITNESS</strong><small>CIVIC COMMAND</small></span></a><nav className="mw-public-nav" aria-label={locale==='id'?'Navigasi utama':'Main navigation'}>{nav.map(item=><a key={item.href} href={item.href}>{item.label}</a>)}</nav><PreferenceControls theme={theme} locale={locale} onThemeChange={onThemeChange} onLocaleChange={onLocaleChange}/></header>;
}

export function CivicShell({ appCode, appName, nav, active, onNavigate, identity, theme, locale, onThemeChange, onLocaleChange, eyebrow, actions, children }: PropsWithChildren<{ appCode: string; appName: string; nav: CivicNavItem[]; active: string; onNavigate?: (id: string) => void; identity?: CivicIdentity; theme: CivicTheme; locale: CivicLocale; onThemeChange: (theme: CivicTheme) => void; onLocaleChange: (locale: CivicLocale) => void; eyebrow?: string; actions?: ReactNode }>) {
  return <div className="mw-shell" data-app={appCode.toLowerCase()}><a className="mw-skip" href="#mw-main">{locale==='id'?'Lewati ke konten utama':'Skip to main content'}</a><aside className="mw-rail"><div className="mw-rail-brand"><span className="mw-sigil" aria-hidden="true">MW</span><span><strong>{appCode}</strong><small>CIVIC COMMAND</small></span></div><nav className="mw-nav" aria-label={`${appName} navigation`}>{nav.map((item,index)=><button key={item.id} type="button" className={active===item.id?'is-active':''} aria-current={active===item.id?'page':undefined} onClick={()=>onNavigate?.(item.id)}><span className="mw-nav-index">{String(index+1).padStart(2,'0')}</span><span>{item.label}</span><i aria-hidden="true">{item.marker??'›'}</i></button>)}</nav><div className="mw-rail-foot"><span className="mw-live-dot"/>SYSTEM LINK<br/><small>ENCRYPTED SESSION</small></div></aside><div className="mw-workspace"><header className="mw-topbar"><div><span className="mw-eyebrow">{eyebrow??'MOONWITNESS CIVIC COMMAND'}</span><h1>{appName}</h1></div><div className="mw-top-actions">{actions}<PreferenceControls theme={theme} locale={locale} onThemeChange={onThemeChange} onLocaleChange={onLocaleChange}/>{identity&&<IdentityPlate identity={identity}/>}</div></header><main id="mw-main" className="mw-main" tabIndex={-1}>{children}</main></div></div>;
}

export function Surface({ title, eyebrow, actions, className = '', children }: PropsWithChildren<{ title?: string; eyebrow?: string; actions?: ReactNode; className?: string }>) { return <section className={`mw-surface ${className}`}>{(title||eyebrow||actions)&&<header className="mw-surface-head"><div>{eyebrow&&<span className="mw-eyebrow">{eyebrow}</span>}{title&&<h2>{title}</h2>}</div>{actions}</header>}<div className="mw-surface-body">{children}</div></section>; }
export function Metric({ label, value, detail, tone = 'neutral' }: { label: string; value: string | number; detail?: string; tone?: CivicTone }) { return <article className={`mw-metric mw-metric-${tone}`}><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</article>; }
export interface CausalNode { id: string; label: string; detail?: string; tone?: CivicTone }
export function CausalLane({ nodes }: { nodes: CausalNode[] }) { return <div className="mw-causal" aria-label="Causal sequence">{nodes.map((node,index)=><div className="mw-causal-step" key={node.id}><article className={`mw-causal-node mw-causal-${node.tone??'neutral'}`}><small>{String(index+1).padStart(2,'0')}</small><strong>{node.label}</strong>{node.detail&&<span>{node.detail}</span>}</article>{index<nodes.length-1&&<span className="mw-causal-link" aria-hidden="true">→</span>}</div>)}</div>; }
