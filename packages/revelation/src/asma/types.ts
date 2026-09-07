import type { ScriptureBook } from '../source-policy.js';

export type AsmaSurfaceKind =
  | 'NAME_ATTRIBUTE_SURFACE'
  | 'DIVINE_PREDICATE_SURFACE'
  | 'DIVINE_ACTION_SURFACE'
  | 'PRONOUN_FRAME_SURFACE';

export type AsmaCandidateStatus =
  | 'SCRIPTURE_ATTESTED'
  | 'CORROBORATED_SURFACE_CANDIDATE';

export interface AsmaCandidate {
  candidateId: string;
  book: ScriptureBook;
  phrase: string;
  normalizedPhrase: string;
  kind: AsmaSurfaceKind;
  status: AsmaCandidateStatus;
  count: number;
  references: string[];
  frames: string[];
  boundary: string;
}

export type DivineRelationType =
  | 'LOVES'
  | 'DOES_NOT_LOVE'
  | 'COMMANDS'
  | 'DOES_NOT_COMMAND'
  | 'FORBIDS'
  | 'FORGIVES'
  | 'DOES_NOT_FORGIVE'
  | 'GUIDES'
  | 'DOES_NOT_GUIDE'
  | 'KNOWS'
  | 'JUDGES';

export interface DivineRelation {
  relationId: string;
  book: ScriptureBook;
  relation: DivineRelationType;
  subject: 'ALLAH';
  predicateSurface: string;
  targetSurface: string;
  reference: string;
  text: string;
  grounding: 'SCRIPTURE_EXPLICIT'|'SCRIPTURE_EXPLICIT_SAME_AYAH_CONTINUATION';
}

export interface AsmaSemanticField {
  candidateId: string;
  phrase: string;
  references: string[];
  contextTokens: Array<{ token: string; count: number }>;
  method: 'CORPUS_COOCCURRENCE_ONLY';
}