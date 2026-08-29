import type { EphemerisBody, EphemerisLocation, EphemerisProvider, HorizonRefraction } from './ephemeris-provider.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function sinDeg(deg: number): number { return Math.sin(deg * DEG2RAD); }
function cosDeg(deg: number): number { return Math.cos(deg * DEG2RAD); }
function tanDeg(deg: number): number { return Math.tan(deg * DEG2RAD); }
function asinDeg(val: number): number { return Math.asin(Math.max(-1, Math.min(1, val))) * RAD2DEG; }
function acosDeg(val: number): number { return Math.acos(Math.max(-1, Math.min(1, val))) * RAD2DEG; }
function atan2Deg(y: number, x: number): number { return Math.atan2(y, x) * RAD2DEG; }

function normalizeDeg(deg: number): number {
  const v = deg % 360;
  return v < 0 ? v + 360 : v;
}

function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function julianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

interface SolarCoordinates {
  declinationDeg: number;
  equationOfTimeMinutes: number;
  solarNoonUtcFraction: number;
}

function calculateSolarCoordinates(t: number, longitude: number): SolarCoordinates {
  const geomMeanLongSun = normalizeDeg(280.46646 + t * (36000.76983 + t * 0.0003032));
  const geomMeanAnomSun = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentEarthOrbit = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const sunEqOfCtr =
    sinDeg(geomMeanAnomSun) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sinDeg(2 * geomMeanAnomSun) * (0.019993 - 0.000101 * t) +
    sinDeg(3 * geomMeanAnomSun) * 0.000289;

  const sunTrueLong = geomMeanLongSun + sunEqOfCtr;
  const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * sinDeg(125.04 - 1934.136 * t);

  const meanObliqEcliptic =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliqCorr = meanObliqEcliptic + 0.00256 * cosDeg(125.04 - 1934.136 * t);

  const sunDeclin = asinDeg(sinDeg(obliqCorr) * sinDeg(sunAppLong));

  const varY = tanDeg(obliqCorr / 2) * tanDeg(obliqCorr / 2);
  const eqOfTime =
    4 *
    RAD2DEG *
    (varY * sinDeg(2 * geomMeanLongSun) -
      2 * eccentEarthOrbit * sinDeg(geomMeanAnomSun) +
      4 * eccentEarthOrbit * varY * sinDeg(geomMeanAnomSun) * cosDeg(2 * geomMeanLongSun) -
      0.5 * varY * varY * sinDeg(4 * geomMeanLongSun) -
      1.25 * eccentEarthOrbit * eccentEarthOrbit * sinDeg(2 * geomMeanAnomSun));

  const solarNoonFraction = (720 - 4 * longitude - eqOfTime) / 1440;

  return {
    declinationDeg: sunDeclin,
    equationOfTimeMinutes: eqOfTime,
    solarNoonUtcFraction: solarNoonFraction,
  };
}

function atmosphericRefraction(altitudeDeg: number): number {
  if (altitudeDeg < -1) return 0;
  if (altitudeDeg > 85) return 0;
  const refr =
    altitudeDeg > 5
      ? 58.1 / Math.tan(altitudeDeg * DEG2RAD) -
        0.07 / Math.pow(Math.tan(altitudeDeg * DEG2RAD), 3) +
        0.000086 / Math.pow(Math.tan(altitudeDeg * DEG2RAD), 5)
      : altitudeDeg > -0.575
        ? 1735 + altitudeDeg * (-518.2 + altitudeDeg * (103.4 + altitudeDeg * (-12.79 + altitudeDeg * 0.711)))
        : -20.774 / Math.tan(altitudeDeg * DEG2RAD);
  return refr / 3600;
}

function sunPositionAt(date: Date, location: EphemerisLocation, refraction: HorizonRefraction): { altitudeDeg: number; azimuthDeg: number } {
  const jd = julianDay(date);
  const t = julianCentury(jd);
  const solar = calculateSolarCoordinates(t, location.longitude);

  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + date.getUTCMilliseconds() / 60000;
  const trueSolarTime = normalizeDeg((utcMinutes + solar.equationOfTimeMinutes + 4 * location.longitude) * 0.25);
  const hourAngle = trueSolarTime < 0 ? trueSolarTime + 180 : trueSolarTime - 180;

  const lat = location.latitude;
  const dec = solar.declinationDeg;

  const sinAlt = sinDeg(lat) * sinDeg(dec) + cosDeg(lat) * cosDeg(dec) * cosDeg(hourAngle);
  let altitude = asinDeg(sinAlt);

  if (refraction === 'normal') {
    altitude += atmosphericRefraction(altitude);
  }

  const cosZenith = sinDeg(altitude);
  const sinZenith = cosDeg(altitude);
  let azimuth: number;
  if (sinZenith > 0.0001) {
    const cosAz = (sinDeg(dec) - sinDeg(lat) * cosZenith) / (cosDeg(lat) * sinZenith);
    const clampedCosAz = Math.max(-1, Math.min(1, cosAz));
    azimuth = acosDeg(clampedCosAz);
    if (hourAngle > 0) {
      azimuth = 360 - azimuth;
    }
  } else {
    azimuth = 180;
  }

  return { altitudeDeg: Number(altitude.toFixed(6)), azimuthDeg: Number(normalizeDeg(azimuth).toFixed(6)) };
}

function moonPositionApprox(date: Date, location: EphemerisLocation, refraction: HorizonRefraction): { altitudeDeg: number; azimuthDeg: number } {
  const jd = julianDay(date);
  const t = julianCentury(jd);

  const l0 = normalizeDeg(218.3164477 + 481267.88123421 * t);
  const m = normalizeDeg(134.9633964 + 477198.8675055 * t);
  const f = normalizeDeg(93.272095 + 483202.0175233 * t);
  const d = normalizeDeg(297.8501921 + 445267.1114034 * t);
  const ms = normalizeDeg(357.5291092 + 35999.0502909 * t);

  const longitude =
    l0 +
    6.288774 * sinDeg(m) +
    1.274027 * sinDeg(2 * d - m) +
    0.658314 * sinDeg(2 * d) +
    0.213618 * sinDeg(2 * m) -
    0.185116 * sinDeg(ms) -
    0.114332 * sinDeg(2 * f);

  const latitude =
    5.128122 * sinDeg(f) +
    0.280602 * sinDeg(m + f) +
    0.277693 * sinDeg(m - f) +
    0.173237 * sinDeg(2 * d - f);

  const meanObliq = 23.439291 - 0.0130042 * t;
  const ra = atan2Deg(sinDeg(longitude) * cosDeg(meanObliq) - tanDeg(latitude) * sinDeg(meanObliq), cosDeg(longitude));
  const dec = asinDeg(sinDeg(latitude) * cosDeg(meanObliq) + cosDeg(latitude) * sinDeg(meanObliq) * sinDeg(longitude));

  const gmst = normalizeDeg(280.46061837 + 360.98564736629 * (jd - 2451545.0));
  const lmst = normalizeDeg(gmst + location.longitude);
  const hourAngle = normalizeDeg(lmst - ra);

  const sinAlt = sinDeg(location.latitude) * sinDeg(dec) + cosDeg(location.latitude) * cosDeg(dec) * cosDeg(hourAngle);
  let altitude = asinDeg(sinAlt);

  if (refraction === 'normal') {
    altitude += atmosphericRefraction(altitude);
  }

  const cosZenith = sinDeg(altitude);
  const sinZenith = cosDeg(altitude);
  let azimuth = 180;
  if (sinZenith > 0.0001) {
    const cosAz = (sinDeg(dec) - sinDeg(location.latitude) * cosZenith) / (cosDeg(location.latitude) * sinZenith);
    azimuth = acosDeg(Math.max(-1, Math.min(1, cosAz)));
    if (sinDeg(hourAngle) > 0) {
      azimuth = 360 - azimuth;
    }
  }

  return { altitudeDeg: Number(altitude.toFixed(6)), azimuthDeg: Number(normalizeDeg(azimuth).toFixed(6)) };
}

function findAltitudeCrossing(
  body: EphemerisBody,
  location: EphemerisLocation,
  direction: 1 | -1,
  start: Date,
  limitDays: number,
  targetAltitudeDeg: number,
): Date | null {
  const stepMinutes = 10;
  const totalMinutes = Math.min(limitDays * 1440, 2880);
  let prevDate = new Date(start.getTime());
  let prevPos = body === 'SUN'
    ? sunPositionAt(prevDate, location, 'normal')
    : moonPositionApprox(prevDate, location, 'normal');
  let prevDiff = prevPos.altitudeDeg - targetAltitudeDeg;

  for (let m = stepMinutes; m <= totalMinutes; m += stepMinutes) {
    const currDate = new Date(start.getTime() + m * 60000);
    const currPos = body === 'SUN'
      ? sunPositionAt(currDate, location, 'normal')
      : moonPositionApprox(currDate, location, 'normal');
    const currDiff = currPos.altitudeDeg - targetAltitudeDeg;

    if (direction === 1 && prevDiff <= 0 && currDiff > 0) {
      return binarySearchCrossing(body, location, prevDate, currDate, targetAltitudeDeg);
    }
    if (direction === -1 && prevDiff >= 0 && currDiff < 0) {
      return binarySearchCrossing(body, location, prevDate, currDate, targetAltitudeDeg);
    }

    prevDate = currDate;
    prevDiff = currDiff;
  }
  return null;
}

function binarySearchCrossing(
  body: EphemerisBody,
  location: EphemerisLocation,
  tLow: Date,
  tHigh: Date,
  targetAltitudeDeg: number,
): Date {
  let low = tLow.getTime();
  let high = tHigh.getTime();
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const midDate = new Date(mid);
    const pos = body === 'SUN'
      ? sunPositionAt(midDate, location, 'normal')
      : moonPositionApprox(midDate, location, 'normal');
    if (pos.altitudeDeg < targetAltitudeDeg) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return new Date(Math.round((low + high) / 2));
}

/**
 * Standard NOAA Solar & Meeus Ephemeris Provider.
 * Provides independent mathematical verification of solar positions, solar noon,
 * rise/set events, and altitude crossing events.
 */
export const noaaMeeusProvider: EphemerisProvider = {
  id: 'noaa-meeus',
  version: '1.0.0',
  algorithmVersion: 'noaa-solar-meeus-v1',
  confidence: 0.95,
  capabilities: {
    sunPosition: true,
    moonPosition: true,
    sunRiseSet: true,
    moonRiseSet: true,
    lunarIllumination: true,
    altitudeCrossing: true,
  },
  position(body, date, location, refraction) {
    if (body === 'SUN') {
      return sunPositionAt(date, location, refraction);
    }
    return moonPositionApprox(date, location, refraction);
  },
  riseSet(body, location, direction, start, limitDays) {
    const targetAlt = body === 'SUN' ? -0.833 : 0.125;
    return findAltitudeCrossing(body, location, direction, start, limitDays, targetAlt);
  },
  altitudeCrossing(body, location, direction, start, limitDays, altitudeDeg) {
    return findAltitudeCrossing(body, location, direction, start, limitDays, altitudeDeg);
  },
  lunarIllumination(date) {
    const jd = julianDay(date);
    const t = julianCentury(jd);
    const d = normalizeDeg(297.8501921 + 445267.1114034 * t);
    const m = normalizeDeg(357.5291092 + 35999.0502909 * t);
    const mp = normalizeDeg(134.9633964 + 477198.8675055 * t);
    const phaseAngle = normalizeDeg(180 - d - 6.289 * sinDeg(mp) + 2.1 * sinDeg(m));
    const elongation = normalizeDeg(180 - phaseAngle);
    return {
      phaseAngleDeg: Number(phaseAngle.toFixed(4)),
      elongationDeg: Number(elongation.toFixed(4)),
    };
  },
};
