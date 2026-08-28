import type { TSETemporalState } from '../../packages/tse-engine/src/index.ts';
import { TSE_GOLD_DATASET, type GoldEvent, type GoldFixture, type VerifiedGoldFixture } from './gold-dataset.ts';

export interface EventError {
  fixtureId: string;
  event: GoldEvent;
  expectedLocalTime: string;
  actualLocalTime: string;
  absoluteErrorMinutes: number;
  withinTolerance: boolean;
}

export interface ErrorStatistics {
  count: number;
  maeMinutes: number | null;
  rmseMinutes: number | null;
  medianMinutes: number | null;
  maxMinutes: number | null;
  p95Minutes: number | null;
}

export interface GoldValidationReport {
  datasetVersion: string;
  verifiedFixtureCount: number;
  structuralFixtureCount: number;
  skippedFixtureIds: string[];
  errors: EventError[];
  overall: ErrorStatistics;
  byEvent: Record<GoldEvent, ErrorStatistics>;
  passed: boolean;
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function minutesSinceMidnight(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`TSE_GOLD_INVALID_LOCAL_TIME:${value}`);
  }
  return hour * 60 + minute;
}

function localTimeOf(utc: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(utc));
}

function eventUtc(state: TSETemporalState, event: GoldEvent): string | null {
  return event === 'sunrise' ? state.solar.sunriseUtc : state.solar.sunsetUtc;
}

function percentile(sorted: readonly number[], quantile: number): number | null {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * quantile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}

export function summarizeErrors(errors: readonly EventError[]): ErrorStatistics {
  if (errors.length === 0) return { count: 0, maeMinutes: null, rmseMinutes: null, medianMinutes: null, maxMinutes: null, p95Minutes: null };
  const values = errors.map((error) => error.absoluteErrorMinutes);
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length,
    maeMinutes: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    rmseMinutes: round(Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0) / values.length)),
    medianMinutes: percentile(sorted, 0.5),
    maxMinutes: sorted.at(-1) ?? null,
    p95Minutes: percentile(sorted, 0.95),
  };
}

function validateVerifiedFixture(fixture: VerifiedGoldFixture, state: TSETemporalState): EventError[] {
  return (['sunrise', 'sunset'] as const).map((event) => {
    const utc = eventUtc(state, event);
    if (!utc) throw new Error(`TSE_GOLD_EVENT_MISSING:${fixture.id}:${event}`);
    const actualLocalTime = localTimeOf(utc, fixture.location.timezone);
    const absoluteErrorMinutes = Math.abs(minutesSinceMidnight(actualLocalTime) - minutesSinceMidnight(fixture.expectedLocalTime[event]));
    return {
      fixtureId: fixture.id,
      event,
      expectedLocalTime: fixture.expectedLocalTime[event],
      actualLocalTime,
      absoluteErrorMinutes,
      withinTolerance: absoluteErrorMinutes <= fixture.toleranceMinutes,
    };
  });
}

/**
 * Calculates reproducible local-civil-time errors. Structural fixtures are deliberately reported as skipped:
 * their values are contract expectations, not source-verified numerical observations.
 */
export function validateGoldDataset(
  calculate: (fixture: GoldFixture) => TSETemporalState,
  fixtures: readonly GoldFixture[] = TSE_GOLD_DATASET,
  datasetVersion = '1.0.0',
): GoldValidationReport {
  const errors: EventError[] = [];
  const skippedFixtureIds: string[] = [];
  let verifiedFixtureCount = 0;
  for (const fixture of fixtures) {
    if (fixture.validationStatus !== 'VERIFIED') {
      skippedFixtureIds.push(fixture.id);
      continue;
    }
    verifiedFixtureCount += 1;
    errors.push(...validateVerifiedFixture(fixture, calculate(fixture)));
  }
  const byEvent = {
    sunrise: summarizeErrors(errors.filter((error) => error.event === 'sunrise')),
    sunset: summarizeErrors(errors.filter((error) => error.event === 'sunset')),
  };
  return {
    datasetVersion,
    verifiedFixtureCount,
    structuralFixtureCount: skippedFixtureIds.length,
    skippedFixtureIds,
    errors,
    overall: summarizeErrors(errors),
    byEvent,
    passed: errors.every((error) => error.withinTolerance),
  };
}
