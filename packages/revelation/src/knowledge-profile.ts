import type { CanonicalProphetProfile } from './prophet-profile.js';
import type { CanonicalScriptureReference } from './scripture-reference.js';
import type { CanonicalPropheticEvent } from './prophetic-event.js';
import { enforceEpistemicBoundary, resolveProfileLane, type KnowledgeSourceClass } from './epistemic-boundary.js';

export type CanonicalProphetKnowledgeProfile = {
  personId: string;
  prophetReferenceId: string;
  name: string;
  aliases: string[];
  role?: string;
  missionTags: string[];
  heroReference: boolean;
  scriptureReferences: CanonicalScriptureReference[];
  propheticEvents: CanonicalPropheticEvent[];
  epistemicLane: 'CORE' | 'DERIVED' | 'UNRESOLVED';
  sourceClass: KnowledgeSourceClass;
  provenance: 'DATASET_CANONICAL';
};

export function buildProphetKnowledgeProfiles(
  profiles: CanonicalProphetProfile[],
  references: CanonicalScriptureReference[],
  events: CanonicalPropheticEvent[],
): CanonicalProphetKnowledgeProfile[] {
  const referencesBySubject = new Map<string, CanonicalScriptureReference[]>();
  for (const reference of references) {
    if (!reference.subjectId) continue;
    const current = referencesBySubject.get(reference.subjectId) ?? [];
    current.push(reference);
    referencesBySubject.set(reference.subjectId, current);
  }

  const eventsByProphet = new Map<string, CanonicalPropheticEvent[]>();
  for (const event of events) {
    const current = eventsByProphet.get(event.prophetId) ?? [];
    current.push(event);
    eventsByProphet.set(event.prophetId, current);
  }

  return profiles.map((profile) => {
    const scriptureReferences = [...(referencesBySubject.get(profile.id) ?? [])]
      .sort((a, b) => a.id.localeCompare(b.id));
    const propheticEvents = [...(eventsByProphet.get(profile.id) ?? [])]
      .sort((a, b) => a.id.localeCompare(b.id));
    const unresolved = scriptureReferences.some((reference) => reference.grounding === 'UNRESOLVED')
      || propheticEvents.some((event) => event.grounding === 'UNRESOLVED');
    const hasExplicitGrounding = profile.quranReferences.length > 0
      || scriptureReferences.some((reference) => reference.grounding === 'QURAN_EXPLICIT')
      || propheticEvents.some((event) => event.grounding === 'QURAN_EXPLICIT');
    const hasDerivedContext = scriptureReferences.some((reference) => reference.grounding === 'DATASET_DERIVED');
    const lane = resolveProfileLane({ hasExplicitGrounding, hasDerivedContext, hasUnresolvedContext: unresolved });

    return {
      personId: profile.id,
      prophetReferenceId: `PROPHET_REFERENCE::${profile.id}`,
      name: profile.name,
      aliases: [...profile.aliases].sort(),
      ...(profile.role ? { role: profile.role } : {}),
      missionTags: [...profile.missionTags].sort(),
      heroReference: profile.heroReference,
      scriptureReferences,
      propheticEvents,
      epistemicLane: enforceEpistemicBoundary(lane, 'REVELATION'),
      sourceClass: 'REVELATION',
      provenance: 'DATASET_CANONICAL',
    };
  });
}
