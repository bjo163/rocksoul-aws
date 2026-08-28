/**
 * Versioned, human-auditable TSE reference vectors.
 *
 * Do not add calculated values to this file. Every value with
 * `validationStatus: 'VERIFIED'` must be traceable to the external source
 * recorded in its `source` field. Structural vectors intentionally have no
 * expected event time and are excluded from accuracy statistics.
 */

export type GoldEvent = 'sunrise' | 'sunset';
export type GoldValidationStatus = 'VERIFIED' | 'STRUCTURAL_ONLY';

export interface GoldLocation {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface GoldSource {
  publisher: 'U.S. Naval Observatory';
  title: string;
  url: string;
  retrievedFromRepository: string;
  sourceTimeBasis: 'STANDARD_TIME_WITH_DAYLIGHT_ADJUSTMENT';
  sourcePrecision: 'ONE_MINUTE';
  notes: string;
}

export interface VerifiedGoldFixture {
  id: string;
  validationStatus: 'VERIFIED';
  timestamp: string;
  location: GoldLocation;
  expectedLocalTime: Record<GoldEvent, string>;
  toleranceMinutes: number;
  source: GoldSource;
}

/** A non-numeric fixture documents a required edge case without claiming an external observation. */
export interface StructuralGoldFixture {
  id: string;
  validationStatus: 'STRUCTURAL_ONLY';
  scenario: 'POLAR_NO_EVENT';
  timestamp: string;
  location: GoldLocation;
  expectedEventStatus: Record<GoldEvent, 'UNRESOLVED'>;
  exclusionReason: string;
}

export type GoldFixture = VerifiedGoldFixture | StructuralGoldFixture;

export const TSE_GOLD_DATASET_VERSION = '1.0.0' as const;

export const TSE_GOLD_DATASET: readonly GoldFixture[] = [
  {
    id: 'USNO-WASHINGTON-2026-08-28',
    validationStatus: 'VERIFIED',
    timestamp: '2026-08-28T12:00:00-04:00',
    location: { name: 'Washington, DC', latitude: 38.89, longitude: -77.03, timezone: 'America/New_York' },
    expectedLocalTime: { sunrise: '06:34', sunset: '19:44' },
    toleranceMinutes: 3,
    source: {
      publisher: 'U.S. Naval Observatory',
      title: 'Sun or Moon Rise/Set Table for One Day',
      url: 'https://aa.usno.navy.mil/data/RS_OneDay',
      retrievedFromRepository: 'tests/tse-usno-gold.test.ts',
      sourceTimeBasis: 'STANDARD_TIME_WITH_DAYLIGHT_ADJUSTMENT',
      sourcePrecision: 'ONE_MINUTE',
      notes: 'The repository fixture records the civil-local result after the USNO table daylight-time adjustment; no second conversion is applied by this dataset.',
    },
  },
  {
    id: 'USNO-SEATTLE-2026-08-28',
    validationStatus: 'VERIFIED',
    timestamp: '2026-08-28T12:00:00-07:00',
    location: { name: 'Seattle, WA', latitude: 47.63, longitude: -122.33, timezone: 'America/Los_Angeles' },
    expectedLocalTime: { sunrise: '06:22', sunset: '19:57' },
    toleranceMinutes: 3,
    source: {
      publisher: 'U.S. Naval Observatory',
      title: 'Sun or Moon Rise/Set Table for One Day',
      url: 'https://aa.usno.navy.mil/data/RS_OneDay',
      retrievedFromRepository: 'tests/tse-usno-gold.test.ts',
      sourceTimeBasis: 'STANDARD_TIME_WITH_DAYLIGHT_ADJUSTMENT',
      sourcePrecision: 'ONE_MINUTE',
      notes: 'The repository fixture records the civil-local result after the USNO table daylight-time adjustment; no second conversion is applied by this dataset.',
    },
  },
  {
    id: 'STRUCTURAL-POLAR-LONGYEARBYEN-2026-06-21',
    validationStatus: 'STRUCTURAL_ONLY',
    scenario: 'POLAR_NO_EVENT',
    timestamp: '2026-06-21T12:00:00Z',
    location: { name: 'Longyearbyen, Svalbard', latitude: 78.2232, longitude: 15.6469, timezone: 'Arctic/Longyearbyen' },
    expectedEventStatus: { sunrise: 'UNRESOLVED', sunset: 'UNRESOLVED' },
    exclusionReason: 'No independently verified external event times have been added yet; this vector only reserves the no-event/polar contract and must not contribute synthetic error data.',
  },
] as const;
