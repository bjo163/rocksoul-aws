import { astronomyEngineProvider, type EphemerisProvider, type HorizonRefraction } from './ephemeris-provider.js';

export interface TSELocation {
  name?: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  timezone: string;
}

export interface TSEInput {
  timestamp: string | Date;
  location: TSELocation;
  activity?: { type: string; description?: string };
  nightModel?: 'SUNSET_TO_SUNRISE' | 'SUNSET_TO_FAJR';
  nightBoundary?: { endTimestamp: string | Date; label?: 'FAJR' | 'SUNRISE' | 'CUSTOM' };
  provider?: EphemerisProvider;
  calculation?: { horizonRefraction?: HorizonRefraction; riseSetSearchDays?: number };
}

export interface TSEEventState {
  status: 'RESOLVED' | 'UNRESOLVED';
  utc: string | null;
  reason?: 'UNSUPPORTED' | 'NO_EVENT_IN_SEARCH_WINDOW';
}

export interface TSETemporalState {
  protocol: 'TEMPORAL_SIGNIFICANCE_ENGINE_V1';
  timestampUtc: string;
  location: TSELocation;
  activity?: TSEInput['activity'];
  solar: {
    altitudeDeg: number;
    azimuthDeg: number;
    sunriseUtc: string | null;
    sunsetUtc: string | null;
    solarNoonApproxUtc: string | null;
    sunrise: TSEEventState;
    sunset: TSEEventState;
  };
  lunar: {
    altitudeDeg: number;
    azimuthDeg: number;
    illuminationFraction: number;
    phaseAngleDeg: number;
    elongationDeg: number;
    moonriseUtc: string | null;
    moonsetUtc: string | null;
    moonrise: TSEEventState;
    moonset: TSEEventState;
  };
  night: {
    model: NonNullable<TSEInput['nightModel']>;
    startUtc: string | null;
    endUtc: string | null;
    durationMinutes: number | null;
    fractionElapsed: number | null;
    segment: 'DAY' | 'NIGHT' | 'FIRST_THIRD' | 'SECOND_THIRD' | 'FINAL_THIRD' | 'UNRESOLVED';
    finalThird: boolean;
  };
  markers: {
    sun45AscendingUtc: string | null;
    sun45DescendingUtc: string | null;
    sun45DistanceDeg: number;
    moon45DistanceDeg: number;
    moon45AtCurrent: boolean;
  };
  scoring: {
    rawScore: number;
    confidence: number;
    confidenceAdjustedScore: number;
    classification: 'LOW' | 'MODERATE' | 'HIGH';
    hypothesisSignalScore: number;
    activityIndependent: true;
  };
  provenance: {
    provider: string;
    providerVersion: string;
    algorithmVersion: string;
    calculationConvention: { canonicalTime: 'UTC'; horizonRefraction: HorizonRefraction; riseSet: 'ASTRONOMY_ENGINE_STANDARD_UPPER_LIMB'; searchDays: number };
    providerCapabilities: EphemerisProvider['capabilities'];
    timezone: string;
    nightDefinition: string;
    scoreIsNotDivineReward: true;
  };
}

function asDate(value: string | Date): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('TSE_INVALID_TIMESTAMP');
  return date;
}

function eventState(value: Date | null, supported: boolean): TSEEventState {
  return value ? { status: 'RESOLVED', utc: value.toISOString() } : { status: 'UNRESOLVED', utc: null, reason: supported ? 'NO_EVENT_IN_SEARCH_WINDOW' : 'UNSUPPORTED' };
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeDeg(value: number): number {
  const v = value % 360;
  return v < 0 ? v + 360 : v;
}

function localDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function timezoneOffsetMinutes(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour) % 24, Number(map.minute), Number(map.second));
  return Math.round((asUtc - date.getTime()) / 60000);
}

function localMidnightUtc(localDate: string, timezone: string): Date {
  const naive = new Date(`${localDate}T00:00:00.000Z`);
  const offset = timezoneOffsetMinutes(naive, timezone);
  return new Date(naive.getTime() - offset * 60000);
}

function solarNoonApprox(sunrise: Date | null, sunset: Date | null): string | null {
  if (!sunrise || !sunset) return null;
  return new Date((sunrise.getTime() + sunset.getTime()) / 2).toISOString();
}

function buildNight(date: Date, input: TSEInput, provider: EphemerisProvider, searchDays: number): TSETemporalState['night'] {
  const model = input.nightModel ?? 'SUNSET_TO_FAJR';
  if (model === 'SUNSET_TO_FAJR' && !input.nightBoundary?.endTimestamp) {
    throw new Error('TSE_FAJR_REQUIRED_FOR_SUNSET_TO_FAJR');
  }
  if (!provider.capabilities.sunRiseSet) {
    return { model, startUtc: null, endUtc: null, durationMinutes: null, fractionElapsed: null, segment: 'UNRESOLVED', finalThird: false };
  }
  const localDay = localDateString(date, input.location.timezone);
  const midnight = localMidnightUtc(localDay, input.location.timezone);
  const prevDay = new Date(midnight.getTime() - 86400000);
  const noon = new Date(midnight.getTime() + 12 * 3600000);
  const nextDay = new Date(midnight.getTime() + 86400000);
  const prevSunset = provider.riseSet('SUN', input.location, -1, prevDay, searchDays);
  const currentSunrise = provider.riseSet('SUN', input.location, 1, midnight, searchDays);
  const currentSunset = provider.riseSet('SUN', input.location, -1, noon, searchDays);
  const nextSunrise = provider.riseSet('SUN', input.location, 1, nextDay, searchDays);

  let start: Date | null = null;
  let end: Date | null = null;
  if (prevSunset && currentSunrise && date >= prevSunset && date <= currentSunrise) {
    start = prevSunset;
    end = model === 'SUNSET_TO_FAJR' ? asDate(input.nightBoundary!.endTimestamp) : currentSunrise;
  } else if (currentSunset && nextSunrise && date >= currentSunset && date <= nextSunrise) {
    start = currentSunset;
    end = model === 'SUNSET_TO_FAJR' ? asDate(input.nightBoundary!.endTimestamp) : nextSunrise;
  }

  if (!start || !end || end.getTime() <= start.getTime() || date < start || date > end) {
    return { model, startUtc: null, endUtc: null, durationMinutes: null, fractionElapsed: null, segment: 'UNRESOLVED', finalThird: false };
  }
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  const fractionElapsed = clamp((date.getTime() - start.getTime()) / (end.getTime() - start.getTime()), 0, 1);
  const segment = fractionElapsed < 1 / 3 ? 'FIRST_THIRD' : fractionElapsed < 2 / 3 ? 'SECOND_THIRD' : fractionElapsed < 1 ? 'FINAL_THIRD' : 'NIGHT';
  return {
    model,
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
    durationMinutes: Number(durationMinutes.toFixed(3)),
    fractionElapsed: Number(fractionElapsed.toFixed(6)),
    segment,
    finalThird: segment === 'FINAL_THIRD'
  };
}

export function calculateTemporalState(input: TSEInput): TSETemporalState {
  const date = asDate(input.timestamp);
  const provider = input.provider ?? astronomyEngineProvider;
  const horizonRefraction = input.calculation?.horizonRefraction ?? 'normal';
  const searchDays = input.calculation?.riseSetSearchDays ?? 1.5;
  if (!Number.isFinite(searchDays) || searchDays <= 0) throw new Error('TSE_RISE_SET_SEARCH_DAYS_INVALID');
  const sun = provider.position('SUN', date, input.location, horizonRefraction);
  const moon = provider.position('MOON', date, input.location, horizonRefraction);
  const localDay = localDateString(date, input.location.timezone);
  const midnight = localMidnightUtc(localDay, input.location.timezone);
  const noon = new Date(midnight.getTime() + 12 * 3600000);
  const sunrise = provider.capabilities.sunRiseSet ? provider.riseSet('SUN', input.location, 1, midnight, searchDays) : null;
  const sunset = provider.capabilities.sunRiseSet ? provider.riseSet('SUN', input.location, -1, noon, searchDays) : null;
  const moonrise = provider.capabilities.moonRiseSet ? provider.riseSet('MOON', input.location, 1, midnight, searchDays) : null;
  const moonset = provider.capabilities.moonRiseSet ? provider.riseSet('MOON', input.location, -1, noon, searchDays) : null;
  const illumination = provider.lunarIllumination(date);
  const phaseAngleDeg = illumination.phaseAngleDeg;
  const elongationDeg = illumination.elongationDeg;

  const dayStart = localMidnightUtc(localDay, input.location.timezone);
  const sun45Ascending = provider.capabilities.altitudeCrossing ? provider.altitudeCrossing('SUN', input.location, 1, dayStart, searchDays, 45) : null;
  const sun45Descending = provider.capabilities.altitudeCrossing ? provider.altitudeCrossing('SUN', input.location, -1, new Date(midnight.getTime() + 12 * 3600000), searchDays, 45) : null;
  const sun45DistanceDeg = Math.abs(sun.altitudeDeg - 45);
  const moon45DistanceDeg = Math.abs(moon.altitudeDeg - 45);
  const night = buildNight(date, input, provider, searchDays);

  const finalThirdSignal = night.finalThird ? 30 : 0;
  const nightSignal = night.segment !== 'DAY' && night.segment !== 'UNRESOLVED' ? 10 : 0;
  const sun45Signal = sun45DistanceDeg <= 0.25 ? 10 : 0;
  const moon45Signal = moon45DistanceDeg <= 0.25 ? 10 : 0;
  const nearFullSignal = Math.min(Math.abs(phaseAngleDeg), Math.abs(180 - phaseAngleDeg)) <= 5 ? 5 : 0;
  const rawScore = Math.min(100, 20 + finalThirdSignal + nightSignal + sun45Signal + moon45Signal + nearFullSignal);
  const providerConfidence = 0.98;
  const confidenceAdjustedScore = Number((rawScore * providerConfidence).toFixed(4));
  const classification = rawScore >= 70 ? 'HIGH' : rawScore >= 40 ? 'MODERATE' : 'LOW';
  const hypothesisSignalScore = sun45Signal + moon45Signal;

  return {
    protocol: 'TEMPORAL_SIGNIFICANCE_ENGINE_V1',
    timestampUtc: date.toISOString(),
    location: input.location,
    activity: input.activity,
    solar: {
      altitudeDeg: Number(sun.altitudeDeg.toFixed(6)),
      azimuthDeg: Number(sun.azimuthDeg.toFixed(6)),
      sunriseUtc: sunrise?.toISOString() ?? null,
      sunsetUtc: sunset?.toISOString() ?? null,
      solarNoonApproxUtc: solarNoonApprox(sunrise, sunset),
      sunrise: eventState(sunrise, provider.capabilities.sunRiseSet),
      sunset: eventState(sunset, provider.capabilities.sunRiseSet)
    },
    lunar: {
      altitudeDeg: Number(moon.altitudeDeg.toFixed(6)),
      azimuthDeg: Number(moon.azimuthDeg.toFixed(6)),
      illuminationFraction: clamp((1 + Math.cos((phaseAngleDeg * Math.PI) / 180)) / 2),
      phaseAngleDeg: Number(phaseAngleDeg.toFixed(6)),
      elongationDeg: Number(elongationDeg.toFixed(6)),
      moonriseUtc: moonrise?.toISOString() ?? null,
      moonsetUtc: moonset?.toISOString() ?? null,
      moonrise: eventState(moonrise, provider.capabilities.moonRiseSet),
      moonset: eventState(moonset, provider.capabilities.moonRiseSet)
    },
    night,
    markers: {
      sun45AscendingUtc: sun45Ascending?.toISOString() ?? null,
      sun45DescendingUtc: sun45Descending?.toISOString() ?? null,
      sun45DistanceDeg: Number(sun45DistanceDeg.toFixed(6)),
      moon45DistanceDeg: Number(moon45DistanceDeg.toFixed(6)),
      moon45AtCurrent: moon45DistanceDeg <= 0.25
    },
    scoring: { rawScore, confidence: providerConfidence, confidenceAdjustedScore, classification, hypothesisSignalScore, activityIndependent: true },
    provenance: {
      provider: provider.id,
      providerVersion: provider.version,
      algorithmVersion: provider.algorithmVersion,
      calculationConvention: { canonicalTime: 'UTC', horizonRefraction, riseSet: 'ASTRONOMY_ENGINE_STANDARD_UPPER_LIMB', searchDays },
      providerCapabilities: provider.capabilities,
      timezone: input.location.timezone,
      nightDefinition: input.nightModel ?? 'SUNSET_TO_FAJR',
      scoreIsNotDivineReward: true
    }
  };
}

export function toMizanTemporalContext(state: TSETemporalState) {
  return {
    schema: 'MIZAN_TEMPORAL_CONTEXT_V1' as const,
    timestampUtc: state.timestampUtc,
    location: state.location,
    temporalState: state,
    signals: {
      temporalScore: state.scoring.confidenceAdjustedScore,
      rawTemporalScore: state.scoring.rawScore,
      confidenceAdjustedScore: state.scoring.confidenceAdjustedScore,
      confidence: state.scoring.confidence,
      finalThird: state.night.finalThird,
      night: state.night.segment !== 'DAY' && state.night.segment !== 'UNRESOLVED',
      sun45Ascending: state.markers.sun45AscendingUtc !== null,
      sun45Descending: state.markers.sun45DescendingUtc !== null,
      moon45Altitude: state.markers.moon45AtCurrent,
      moon45Elongation: Math.abs(state.lunar.elongationDeg - 45) <= 0.25
    },
    provenance: state.provenance,
    safeguards: {
      scoreIsNotDivineReward: true,
      activityIndependent: true,
      hypothesesAreNotRevealedRules: true
    }
  };
}

export function phaseName(angle: number): string {
  const a = normalizeDeg(angle);
  if (a < 22.5 || a >= 337.5) return 'NEW';
  if (a < 67.5) return 'WAXING_CRESCENT';
  if (a < 112.5) return 'FIRST_QUARTER';
  if (a < 157.5) return 'WAXING_GIBBOUS';
  if (a < 202.5) return 'FULL';
  if (a < 247.5) return 'WANING_GIBBOUS';
  if (a < 292.5) return 'LAST_QUARTER';
  return 'WANING_CRESCENT';
}

export * from './ephemeris-provider.js';
export * from './hypothesis-registry.js';
export * from './temporal-scoring.js';
