import * as Astronomy from 'astronomy-engine';

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
  };
  lunar: {
    altitudeDeg: number;
    azimuthDeg: number;
    illuminationFraction: number;
    phaseAngleDeg: number;
    elongationDeg: number;
    moonriseUtc: string | null;
    moonsetUtc: string | null;
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

function iso(value: Astronomy.AstroTime | null): string | null {
  return value ? value.date.toISOString() : null;
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

function observer(location: TSELocation): Astronomy.Observer {
  return new Astronomy.Observer(location.latitude, location.longitude, location.elevationMeters ?? 0);
}

function horizontal(body: Astronomy.Body, date: Date, obs: Astronomy.Observer) {
  const eq = Astronomy.Equator(body, date, obs, true, true);
  return Astronomy.Horizon(date, obs, eq.ra, eq.dec, 'normal');
}

function sunAt(date: Date, obs: Astronomy.Observer) {
  return horizontal(Astronomy.Body.Sun, date, obs);
}

function moonAt(date: Date, obs: Astronomy.Observer) {
  return horizontal(Astronomy.Body.Moon, date, obs);
}

function nearestEvent(date: Date, obs: Astronomy.Observer, body: Astronomy.Body, direction: number, limitDays: number): Astronomy.AstroTime | null {
  return Astronomy.SearchRiseSet(body, obs, direction, date, limitDays, 0);
}

function altitudeCrossing(start: Date, obs: Astronomy.Observer, altitude: number, direction: number): Astronomy.AstroTime | null {
  return Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, direction, start, 1, altitude);
}

function solarNoonApprox(sunrise: Astronomy.AstroTime | null, sunset: Astronomy.AstroTime | null): string | null {
  if (!sunrise || !sunset) return null;
  return new Date((sunrise.date.getTime() + sunset.date.getTime()) / 2).toISOString();
}

function buildNight(date: Date, input: TSEInput, obs: Astronomy.Observer): TSETemporalState['night'] {
  const model = input.nightModel ?? 'SUNSET_TO_FAJR';
  if (model === 'SUNSET_TO_FAJR' && !input.nightBoundary?.endTimestamp) {
    throw new Error('TSE_FAJR_REQUIRED_FOR_SUNSET_TO_FAJR');
  }
  const localDay = localDateString(date, input.location.timezone);
  const midnight = localMidnightUtc(localDay, input.location.timezone);
  const prevDay = new Date(midnight.getTime() - 86400000);
  const nextDay = new Date(midnight.getTime() + 86400000);
  const prevSunset = nearestEvent(prevDay, obs, Astronomy.Body.Sun, -1, 1.5);
  const currentSunrise = nearestEvent(midnight, obs, Astronomy.Body.Sun, 1, 1.5);
  const currentSunset = nearestEvent(midnight, obs, Astronomy.Body.Sun, -1, 1.5);
  const nextSunrise = nearestEvent(nextDay, obs, Astronomy.Body.Sun, 1, 1.5);

  let start: Date | null = null;
  let end: Date | null = null;
  if (prevSunset && currentSunrise && date >= prevSunset.date && date <= currentSunrise.date) {
    start = prevSunset.date;
    end = model === 'SUNSET_TO_FAJR' ? asDate(input.nightBoundary!.endTimestamp) : currentSunrise.date;
  } else if (currentSunset && nextSunrise && date >= currentSunset.date && date <= nextSunrise.date) {
    start = currentSunset.date;
    end = model === 'SUNSET_TO_FAJR' ? asDate(input.nightBoundary!.endTimestamp) : nextSunrise.date;
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
  const obs = observer(input.location);
  const sun = sunAt(date, obs);
  const moon = moonAt(date, obs);
  const localDay = localDateString(date, input.location.timezone);
  const midnight = localMidnightUtc(localDay, input.location.timezone);
  const sunrise = nearestEvent(new Date(midnight.getTime() - 86400000), obs, Astronomy.Body.Sun, 1, 2);
  const sunset = nearestEvent(midnight, obs, Astronomy.Body.Sun, -1, 2);
  const moonrise = nearestEvent(new Date(midnight.getTime() - 86400000), obs, Astronomy.Body.Moon, 1, 2);
  const moonset = nearestEvent(midnight, obs, Astronomy.Body.Moon, -1, 2);
  const illumination = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const phaseAngleDeg = illumination.phase_angle;
  const elongationDeg = Astronomy.AngleFromSun(Astronomy.Body.Moon, date);

  const dayStart = localMidnightUtc(localDay, input.location.timezone);
  const sun45Ascending = altitudeCrossing(dayStart, obs, 45, 1);
  const sun45Descending = altitudeCrossing(new Date(midnight.getTime() + 12 * 3600000), obs, 45, -1);
  const sun45DistanceDeg = Math.abs(sun.altitude - 45);
  const moon45DistanceDeg = Math.abs(moon.altitude - 45);
  const night = buildNight(date, input, obs);

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
      altitudeDeg: Number(sun.altitude.toFixed(6)),
      azimuthDeg: Number(sun.azimuth.toFixed(6)),
      sunriseUtc: iso(sunrise),
      sunsetUtc: iso(sunset),
      solarNoonApproxUtc: solarNoonApprox(sunrise, sunset)
    },
    lunar: {
      altitudeDeg: Number(moon.altitude.toFixed(6)),
      azimuthDeg: Number(moon.azimuth.toFixed(6)),
      illuminationFraction: clamp((1 + Math.cos((phaseAngleDeg * Math.PI) / 180)) / 2),
      phaseAngleDeg: Number(phaseAngleDeg.toFixed(6)),
      elongationDeg: Number(elongationDeg.toFixed(6)),
      moonriseUtc: iso(moonrise),
      moonsetUtc: iso(moonset)
    },
    night,
    markers: {
      sun45AscendingUtc: iso(sun45Ascending),
      sun45DescendingUtc: iso(sun45Descending),
      sun45DistanceDeg: Number(sun45DistanceDeg.toFixed(6)),
      moon45DistanceDeg: Number(moon45DistanceDeg.toFixed(6)),
      moon45AtCurrent: moon45DistanceDeg <= 0.25
    },
    scoring: { rawScore, confidence: providerConfidence, confidenceAdjustedScore, classification, hypothesisSignalScore, activityIndependent: true },
    provenance: {
      provider: 'astronomy-engine',
      providerVersion: '2.1.19',
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
