import { runtimeDataset } from '../persistence/runtime-data.js';

export interface QuranNarrativePattern {
  id: string;
  subject: string;
  references: string[];
  arc: string[];
}

export async function loadQuranNarrativePatterns(): Promise<QuranNarrativePattern[]> {
  const raw = runtimeDataset('data/revelation/quran-story-patterns.json') as { patterns: QuranNarrativePattern[] };
  return raw.patterns;
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
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
