import type { CivicTone } from './system.js';

export type GovernedState = 'OBSERVED'|'SUPPORTED'|'VERIFIED'|'CORROBORATED'|'INFERRED'|'UNKNOWN'|'CONFLICTED'|'PROVISIONAL'|'REVIEW_REQUIRED'|'BLOCKED'|'VALID'|'INVALID'|'PENDING'|'RESOLVED'|'NOT_EVALUATED'|string;

export function governedToneForState(state: GovernedState | null | undefined): CivicTone {
  const value=String(state??'').toUpperCase();
  if(['VERIFIED','CORROBORATED','SUPPORTED','VALID','RESOLVED','ALLOW'].includes(value)) return 'positive';
  if(['CONFLICTED','BLOCKED','INVALID','REJECT','CRITICAL'].includes(value)) return 'danger';
  if(['PROVISIONAL','REVIEW_REQUIRED','REQUIRE_HUMAN_REVIEW','PENDING','HIGH','MEDIUM'].includes(value)) return 'warning';
  if(['OBSERVED','INFERRED','INFO','LOW'].includes(value)) return 'info';
  return 'neutral';
}

function StatePill({state}:{state:GovernedState}){const tone=governedToneForState(state);return <span className={`mw-governed-state mw-status-${tone}`}><i aria-hidden="true"/>{String(state).replaceAll('_',' ')}</span>;}

export interface EvidenceView { id:string; status?:GovernedState; sourceType?:string; reference?:string; confidence?:number|null; superseded?:boolean }
export function EvidenceLedger({items,emptyLabel='No evidence attached.'}:{items:EvidenceView[];emptyLabel?:string}){
  return <section className="mw-governed" aria-label="Evidence state"><header><span className="mw-eyebrow">EVIDENCE STATE</span><strong>{items.length} RECORD{items.length===1?'':'S'}</strong></header>{items.length?<ul className="mw-evidence-ledger">{items.map(item=><li key={item.id} className={item.superseded?'is-superseded':''}><div><StatePill state={item.status??'UNKNOWN'}/><small>{item.sourceType??'UNSPECIFIED SOURCE'}</small></div><strong>{item.reference??item.id}</strong><span>{typeof item.confidence==='number'?`${Math.round(item.confidence*100)}% confidence`:'confidence not supplied'}</span>{item.superseded&&<em>SUPERSEDED · RETAINED FOR HISTORY</em>}</li>)}</ul>:<div className="mw-governed-empty"><StatePill state="UNKNOWN"/><span>{emptyLabel}</span></div>}</section>;
}

export interface ReviewGateView { decision?:GovernedState; severity?:GovernedState; requiresHumanReview?:boolean; adverseActionBlocked?:boolean; reasons?:Array<string|{code?:string;message?:string}>; boundary?:string }
export function ReviewGatePanel({gate,title='Human Review Gate'}:{gate:ReviewGateView|null|undefined;title?:string}){
  const decision=gate?.decision??'NOT_EVALUATED'; const reasons=gate?.reasons??[];
  return <section className="mw-governed mw-review-gate" aria-label={title}><header><div><span className="mw-eyebrow">GOVERNED DECISION BOUNDARY</span><h3>{title}</h3></div><StatePill state={decision}/></header><div className="mw-governed-grid"><div><span>Decision</span><strong>{String(decision).replaceAll('_',' ')}</strong></div><div><span>Severity</span><strong>{gate?.severity??'NOT ASSESSED'}</strong></div><div><span>Human review</span><strong>{gate?.requiresHumanReview?'REQUIRED':'NOT INDICATED'}</strong></div><div><span>Adverse action</span><strong>{gate?.adverseActionBlocked===false?'NOT BLOCKED':'BLOCKED BY DEFAULT'}</strong></div></div>{reasons.length>0&&<ul className="mw-governed-reasons">{reasons.map((reason,index)=><li key={index}>{typeof reason==='string'?reason:reason.message??reason.code??'Unspecified review reason'}</li>)}</ul>}<p className="mw-governed-boundary">{gate?.boundary??'No automated result grants final authority. Human review remains operational and cannot become Divine judgement.'}</p></section>;
}

export interface WitnessView { state?:GovernedState; hash?:string|null; root?:string|null; nodeCount?:number|null; checkpointId?:string|null }
export function WitnessPanel({witness,title='Witness Integrity'}:{witness:WitnessView|null|undefined;title?:string}){
  const state=witness?.state??(witness?.hash||witness?.root?'VALID':'PENDING');
  return <section className="mw-governed mw-witness-panel" aria-label={title}><header><div><span className="mw-eyebrow">HASH COMMITMENT · NOT VERDICT</span><h3>{title}</h3></div><StatePill state={state}/></header><div className="mw-governed-grid"><div><span>Nodes</span><strong>{witness?.nodeCount??'—'}</strong></div><div><span>Checkpoint</span><strong>{witness?.checkpointId??'NONE'}</strong></div></div>{(witness?.hash||witness?.root)&&<div className="mw-governed-hashes">{witness.hash&&<p><span>Commitment</span><code>{witness.hash}</code></p>}{witness.root&&<p><span>DAG root</span><code>{witness.root}</code></p>}</div>}<p className="mw-governed-boundary">Witness proves integrity and ordering of committed data. It does not prove factual truth or Divine acceptance.</p></section>;
}

export interface AuditEntryView { id:string; type:string; subject?:string; actor?:string; time?:string; detail?:string }
export function AuditTimeline({entries,emptyLabel='No audit records available.'}:{entries:AuditEntryView[];emptyLabel?:string}){
  return <section className="mw-governed" aria-label="Audit timeline"><header><span className="mw-eyebrow">IMMUTABLE OPERATIONAL TRAIL</span><strong>{entries.length} EVENTS</strong></header>{entries.length?<ol className="mw-audit-timeline">{entries.map(entry=><li key={entry.id}><i aria-hidden="true"/><div><strong>{entry.type.replaceAll('_',' ')}</strong><span>{entry.subject??'No subject'}{entry.actor?` · ${entry.actor}`:''}</span>{entry.detail&&<small>{entry.detail}</small>}</div><time dateTime={entry.time}>{entry.time?new Date(entry.time).toLocaleString():'TIME UNKNOWN'}</time></li>)}</ol>:<div className="mw-governed-empty"><StatePill state="PENDING"/><span>{emptyLabel}</span></div>}</section>;
}

export function WorldStateSnapshot({entities=0,relations=0,events=0,integrity=null,mode='observed'}:{entities?:number;relations?:number;events?:number;integrity?:boolean|null;mode?:'observed'|'simulation'}){
  return <section className="mw-governed mw-world-state" aria-label="World state model"><header><div><span className="mw-eyebrow">BOUNDED WORLD MODEL</span><h3>World State Snapshot</h3></div><StatePill state={integrity===true?'VALID':integrity===false?'INVALID':'PENDING'}/></header><div className="mw-world-orbit" aria-hidden="true"><span/><i/><b/></div><div className="mw-governed-grid"><div><span>Entities</span><strong>{entities}</strong></div><div><span>Relations</span><strong>{relations}</strong></div><div><span>Events</span><strong>{events}</strong></div><div><span>Mode</span><strong>{mode==='simulation'?'SIMULATION':'OBSERVED MODEL'}</strong></div></div><p className="mw-governed-boundary">{mode==='simulation'?'SIMULATION · NOT REALITY · HUMAN AUTHORITY · LIMITED':'OPERATIONAL MODEL · NOT COMPLETE REALITY · HUMAN AUTHORITY · LIMITED'}</p></section>;
}
