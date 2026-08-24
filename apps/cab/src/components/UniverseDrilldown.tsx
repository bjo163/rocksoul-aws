import { useEffect, useMemo, useState } from 'react';
import { AuditTimeline, WitnessPanel } from '@moonwitness/ui';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import universeEn from '../locales/universe-en.json';
import universeId from '../locales/universe-id.json';
import type { Locale } from '../lib/i18n';

type RecordData = Record<string, unknown>;
type UniverseCopy = typeof universeEn;
type JsonRecord = RecordData & { id?: string; entityId?: string; data?: RecordData };

function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => typeof item === 'object' && item !== null) : []; }
function text(value: unknown): string | undefined { return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined; }

export function UniverseDrilldown({ events, prophets, relations, ledger, locale = 'id' }: { events: JsonRecord[]; prophets: JsonRecord[]; relations: JsonRecord[]; ledger: JsonRecord[]; locale?: Locale }) {
  const [selectedEvent, setSelectedEvent] = useState<JsonRecord | null>(null);
  const [selectedProphet, setSelectedProphet] = useState<JsonRecord | null>(null);
  const [reviews, setReviews] = useState<JsonRecord[]>([]);
  const [witness, setWitness] = useState<JsonRecord | null>(null);
  const copy: UniverseCopy = locale === 'id' ? universeId : universeEn;
  const shell = useTranslation(locale).shell;

  useEffect(() => {
    Promise.all([api.reviews(), api.witnessStatus()]).then(([reviewData, witnessData]) => {
      setReviews(records(reviewData?.reviews)); setWitness(typeof witnessData === 'object' && witnessData !== null ? witnessData as JsonRecord : null);
    }).catch(() => { setReviews([]); setWitness(null); });
  }, []);

  const activeReviews = reviews.filter((review) => review.status !== 'DISPOSED');
  const eventData = selectedEvent?.data ?? selectedEvent;
  const prophetData = selectedProphet?.data ?? selectedProphet;
  const eventId = text(selectedEvent?.entityId ?? selectedEvent?.id);
  const prophetId = text(selectedProphet?.entityId ?? selectedProphet?.id);
  const eventReferences = strings(eventData?.quranReferences ?? eventData?.scriptureReferences);
  const eventRelations = useMemo(() => relations.filter((relation) => text(relation.fromId) === eventId || text(relation.toId) === eventId), [relations, eventId]);
  const prophetEvents = useMemo(() => events.filter((event) => text(event.data?.prophetId ?? event.prophetId) === prophetId), [events, prophetId]);

  return <>
    <div className="mw-grid">
      <section aria-label={copy.eventToPassage}><Card><CardHeader><div className="mw-eyebrow">{copy.eventToPassage}</div><CardTitle>{copy.propheticEvents}</CardTitle></CardHeader><CardContent><div className="mw-stack" role="list" aria-label={copy.propheticEvents}>
        {events.slice(0, 12).map((event) => { const id = text(event.entityId ?? event.id) ?? JSON.stringify(event); const data = event.data ?? event; const refs = strings(data.quranReferences ?? data.scriptureReferences); const selected = id === eventId; return <div key={id} className="mw-route-placeholder" role="listitem"><div><strong>{text(data.title) ?? id}</strong><span>{text(data.prophetId) ?? 'PROPHET_REFERENCE'}</span></div><div className="mw-muted">{refs.length ? refs.join(' · ') : copy.unresolvedReference}</div><Button type="button" aria-pressed={selected} aria-label={`${selected ? copy.selected : copy.openEvent}: ${text(data.title) ?? id}`} variant={selected ? 'secondary' : 'ghost'} onClick={() => setSelectedEvent(event)}>{selected ? copy.selected : copy.openEvent}</Button></div>; })}
        {!events.length && <div className="mw-muted">{copy.noEvents}</div>}
      </div></CardContent></Card></section>
      <section aria-label={copy.prophetProfile}><Card><CardHeader><div className="mw-eyebrow">{copy.prophetProfile}</div><CardTitle>{copy.profilesTitle}</CardTitle></CardHeader><CardContent><div className="mw-model-list" role="list" aria-label={copy.profilesTitle}>
        {prophets.slice(0, 25).map((prophet) => { const id = text(prophet.entityId ?? prophet.id) ?? JSON.stringify(prophet); const data = prophet.data ?? prophet; const selected = id === prophetId; return <div key={id} className="mw-route-placeholder" role="listitem"><div><strong>{text(data.name) ?? id}</strong><span>{text(data.role) ?? 'PROPHET_REFERENCE'}</span></div><Button type="button" aria-pressed={selected} aria-label={`${selected ? copy.selected : copy.profile}: ${text(data.name) ?? id}`} variant={selected ? 'secondary' : 'ghost'} onClick={() => setSelectedProphet(prophet)}>{selected ? copy.selected : copy.profile}</Button></div>; })}
      </div></CardContent></Card></section>
    </div>
    {(selectedEvent || selectedProphet) && <div className="mw-grid">
      {selectedEvent && <section aria-label={copy.eventDetail}><Card><CardHeader><div className="mw-eyebrow">{copy.eventDetail}</div><CardTitle>{text(eventData?.title) ?? eventId}</CardTitle></CardHeader><CardContent><div className="mw-status-grid"><div><span>{copy.prophet}</span><strong>{text(eventData?.prophetId) ?? copy.unresolved}</strong></div><div><span>{copy.evidenceClass}</span><strong>{text(eventData?.evidenceClass) ?? copy.unknown}</strong></div><div><span>{copy.grounding}</span><strong>{text(eventData?.grounding) ?? copy.unresolved}</strong></div><div><span>{copy.linkedRelations}</span><strong>{eventRelations.length}</strong></div></div><div className="mw-stack"><div className="mw-eyebrow">{copy.scripturePassages}</div>{eventReferences.length ? eventReferences.map((reference) => <div key={reference} className="mw-route-placeholder"><strong>{reference}</strong><span>{copy.passageReference}</span></div>) : <div className="mw-muted">{copy.noExplicitPassage}</div>}</div></CardContent></Card></section>}
      {selectedProphet && <section aria-label={copy.profileDetail}><Card><CardHeader><div className="mw-eyebrow">{copy.profileDetail}</div><CardTitle>{text(prophetData?.name) ?? prophetId}</CardTitle></CardHeader><CardContent><div className="mw-status-grid"><div><span>{copy.role}</span><strong>{text(prophetData?.role) ?? 'PROPHET_REFERENCE'}</strong></div><div><span>{copy.order}</span><strong>{text(prophetData?.order) ?? '—'}</strong></div><div><span>{copy.mission}</span><strong>{strings(prophetData?.missionTags).join(' · ') || '—'}</strong></div><div><span>{copy.eventCount}</span><strong>{prophetEvents.length}</strong></div></div><div className="mw-stack"><div className="mw-eyebrow">{copy.events}</div>{prophetEvents.slice(0, 8).map((event) => <Button key={text(event.entityId ?? event.id) ?? JSON.stringify(event)} type="button" className="mw-route-placeholder" variant="ghost" aria-label={`${copy.openEvent}: ${text(event.data?.title ?? event.title ?? event.entityId ?? event.id) ?? ''}`} onClick={() => setSelectedEvent(event)}>{text(event.data?.title ?? event.title ?? event.entityId ?? event.id) ?? ''}</Button>)}{!prophetEvents.length && <div className="mw-muted">{copy.noSourceGroundedEvents}</div>}</div></CardContent></Card></section>}
    </div>}
    <section aria-label={copy.governanceRail}><Card><CardHeader><div className="mw-eyebrow">{copy.governanceRail}</div><CardTitle>{copy.reviewWitnessAudit}</CardTitle></CardHeader><CardContent><div className="mw-governed-pair"><div className="mw-stack" role="list" aria-label={shell.reviewQueue}>{activeReviews.slice(0, 6).map((review) => <div key={text(review.reviewId ?? review.id) ?? JSON.stringify(review)} className="mw-route-placeholder" role="listitem"><strong>{text(review.status) ?? copy.unknown}</strong><span>{text(review.targetId ?? review.reviewId ?? review.id) ?? ''}</span><span>{text(review.disposition ?? review.gateDecision) ?? copy.pending}</span></div>)}{!activeReviews.length && <div className="mw-muted">{copy.noActiveReviews}</div>}</div><WitnessPanel witness={{ state: witness?.valid === true || Boolean(witness?.hash || witness?.root) ? 'VALID' : 'PENDING', hash: text(witness?.hash), root: text(witness?.root), nodeCount: typeof witness?.nodes === 'number' ? witness.nodes : null, checkpointId: text(witness?.checkpointId) }} /></div><AuditTimeline entries={ledger.map((entry, index) => ({ id: text(entry.ledgerId ?? entry.id) ?? `${index}`, type: text(entry.type) ?? 'LEDGER_EVENT', subject: text(entry.entityId), actor: text(entry.actorId ?? entry.actorRid), time: text(entry.recordedAt ?? entry.timestamp), detail: text(entry.summary) }))} /></CardContent></Card></section>
  </>;
}
