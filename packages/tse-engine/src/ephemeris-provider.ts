import * as Astronomy from 'astronomy-engine';

export type EphemerisBody = 'SUN' | 'MOON';
export type HorizonRefraction = 'none' | 'normal';

export interface EphemerisLocation {
  latitude: number;
  longitude: number;
  elevationMeters?: number;
}

export interface EphemerisCapabilities {
  sunPosition: boolean;
  moonPosition: boolean;
  sunRiseSet: boolean;
  moonRiseSet: boolean;
  lunarIllumination: boolean;
  altitudeCrossing: boolean;
}

export interface EphemerisProvider {
  readonly id: string;
  readonly version: string;
  readonly algorithmVersion: string;
  readonly capabilities: EphemerisCapabilities;
  position(body: EphemerisBody, date: Date, location: EphemerisLocation, refraction: HorizonRefraction): { altitudeDeg: number; azimuthDeg: number };
  riseSet(body: EphemerisBody, location: EphemerisLocation, direction: 1 | -1, start: Date, limitDays: number): Date | null;
  altitudeCrossing(body: EphemerisBody, location: EphemerisLocation, direction: 1 | -1, start: Date, limitDays: number, altitudeDeg: number): Date | null;
  lunarIllumination(date: Date): { phaseAngleDeg: number; elongationDeg: number };
}

function bodyOf(body: EphemerisBody): Astronomy.Body {
  return body === 'SUN' ? Astronomy.Body.Sun : Astronomy.Body.Moon;
}

function observer(location: EphemerisLocation): Astronomy.Observer {
  return new Astronomy.Observer(location.latitude, location.longitude, location.elevationMeters ?? 0);
}

/** Astronomy Engine adapter. All public TSE contracts remain provider-neutral. */
export const astronomyEngineProvider: EphemerisProvider = {
  id: 'astronomy-engine',
  version: '2.1.19',
  algorithmVersion: 'astronomy-engine-2.1.19',
  capabilities: {
    sunPosition: true,
    moonPosition: true,
    sunRiseSet: true,
    moonRiseSet: true,
    lunarIllumination: true,
    altitudeCrossing: true,
  },
  position(body, date, location, refraction) {
    const obs = observer(location);
    const equator = Astronomy.Equator(bodyOf(body), date, obs, true, true);
    const horizontal = Astronomy.Horizon(date, obs, equator.ra, equator.dec, refraction === 'normal' ? 'normal' : undefined);
    return { altitudeDeg: horizontal.altitude, azimuthDeg: horizontal.azimuth };
  },
  riseSet(body, location, direction, start, limitDays) {
    return Astronomy.SearchRiseSet(bodyOf(body), observer(location), direction, start, limitDays, 0)?.date ?? null;
  },
  altitudeCrossing(body, location, direction, start, limitDays, altitudeDeg) {
    return Astronomy.SearchAltitude(bodyOf(body), observer(location), direction, start, limitDays, altitudeDeg)?.date ?? null;
  },
  lunarIllumination(date) {
    const illumination = Astronomy.Illumination(Astronomy.Body.Moon, date);
    return {
      phaseAngleDeg: illumination.phase_angle,
      elongationDeg: Astronomy.AngleFromSun(Astronomy.Body.Moon, date),
    };
  },
};
