import { runtimeDatasetOr } from '@moonwitness/persistence';

export interface QuranNarrativePattern {
  id: string;
  subject: string;
  references: string[];
  arc: string[];
}

interface QuranNarrativePatternData {
  patterns: QuranNarrativePattern[];
}

export async function loadQuranNarrativePatterns(): Promise<QuranNarrativePattern[]> {
  return runtimeDatasetOr<QuranNarrativePatternData>('data/revelation/quran-story-patterns.json', { patterns: [] }).patterns;
}

export function scoreNarrativePattern(input: { text?: string; concepts?: string[]; references?: string[] }, pattern: QuranNarrativePattern): number {
  const haystack = `${input.text ?? ''} ${(input.concepts ?? []).join(' ')} ${(input.references ?? []).join(' ')}`.toLowerCase();
  const tokens = [pattern.subject, ...pattern.arc, ...pattern.references];
  const hits = tokens.reduce((sum, token) => sum + (haystack.includes(token.toLowerCase()) ? 1 : 0), 0);
  return tokens.length ? hits / tokens.length : 0;
}

export async function matchQuranNarratives(input: { text?: string; concepts?: string[]; references?: string[] }, limit = 5) {
  const patterns = await loadQuranNarrativePatterns();
  return patterns
    .map(pattern => ({ pattern, score: scoreNarrativePattern(input, pattern) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
}