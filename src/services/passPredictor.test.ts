import { describe, expect, it } from 'vitest';
import {
  azimuthToCompass,
  estimateCurrentPosition,
  getSunEciKm,
  isSatelliteSunlit,
  predictPasses,
} from './passPredictor';
import {
  getDemoTleDataset,
  getOrbitDataStaleStatus,
  parseOmmJsonPayload,
  parseTleEpoch,
  parseTleText,
} from './tleService';

describe('passPredictor SGP4 calculations', () => {
  it('converts azimuth degrees to 16-point compass bearings', () => {
    expect(azimuthToCompass(0)).toBe('N');
    expect(azimuthToCompass(90)).toBe('E');
    expect(azimuthToCompass(225)).toBe('SW');
    expect(azimuthToCompass(359)).toBe('N');
  });

  it('parses TLE epoch into an ISO timestamp', () => {
    const line1 = '1 25544U 98067A   26328.50000000  .00014250  00000+0  25840-3 0  9995';
    const iso = parseTleEpoch(line1);
    expect(iso.startsWith('2026-11-24T12:00:00')).toBe(true);
  });

  it('parses standard 3-line CelesTrak TLE text', () => {
    const raw = [
      'ISS (ZARYA)',
      '1 25544U 98067A   26328.51423611  .00014250  00000+0  25840-3 0  9995',
      '2 25544  51.6388 214.4820 0006214 112.4510  48.2910 15.49814210482159',
    ].join('\n');

    const parsed = parseTleText(raw, '25544', 'https://celestrak.org/test');
    expect(parsed.satelliteName).toBe('ISS (ZARYA)');
    expect(parsed.noradId).toBe('25544');
    expect(parsed.format).toBe('tle');
  });

  it('parses CelesTrak OMM JSON and initializes SGP4 via json2satrec', () => {
    const ommPayload = [
      {
        OBJECT_NAME: 'ISS (ZARYA)',
        OBJECT_ID: '1998-067A',
        EPOCH: '2026-11-25T12:00:00.000000',
        MEAN_MOTION: 15.4981421,
        ECCENTRICITY: 0.0006214,
        INCLINATION: 51.6388,
        RA_OF_ASC_NODE: 214.482,
        ARG_OF_PERICENTER: 112.451,
        MEAN_ANOMALY: 48.291,
        EPHEMERIS_TYPE: 0,
        CLASSIFICATION_TYPE: 'U',
        NORAD_CAT_ID: 25544,
        ELEMENT_SET_NO: 999,
        REV_AT_EPOCH: 48215,
        BSTAR: 0.0002584,
        MEAN_MOTION_DOT: 0.0001425,
        MEAN_MOTION_DDOT: 0,
      },
    ];

    const parsed = parseOmmJsonPayload(
      ommPayload,
      '25544',
      'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON',
    );
    expect(parsed.format).toBe('omm-json');
    expect(parsed.satelliteName).toBe('ISS (ZARYA)');
    expect(parsed.epochAt).toBe('2026-11-25T12:00:00.000Z');
  });

  it('detects Earth shadow vs sunlit satellite positions', () => {
    const sun = getSunEciKm(new Date('2026-11-24T12:00:00Z'));
    const sunMag = Math.hypot(sun.x, sun.y, sun.z);
    const unit = { x: sun.x / sunMag, y: sun.y / sunMag, z: sun.z / sunMag };

    expect(isSatelliteSunlit({ x: unit.x * 6800, y: unit.y * 6800, z: unit.z * 6800 }, sun)).toBe(
      true,
    );
    expect(
      isSatelliteSunlit({ x: -unit.x * 6800, y: -unit.y * 6800, z: -unit.z * 6800 }, sun),
    ).toBe(false);
  });

  it('estimates current ISS ground track, altitude, speed, and look angles', () => {
    const dataset = getDemoTleDataset('25544');
    const estimate = estimateCurrentPosition(
      dataset,
      {
        name: 'Bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
        elevationM: 920,
        timezone: 'Asia/Kolkata',
      },
      new Date('2026-11-25T15:00:00Z'),
    );

    expect(estimate.latitudeDeg).toBeGreaterThanOrEqual(-52);
    expect(estimate.latitudeDeg).toBeLessThanOrEqual(52);
    expect(estimate.altitudeKm).toBeGreaterThan(300);
    expect(estimate.altitudeKm).toBeLessThan(550);
    expect(estimate.speedKmS).toBeGreaterThan(7);
    expect(estimate.speedKmS).toBeLessThan(8.2);
  });

  it('computes upcoming passes whose dates and times change when location or date range changes', () => {
    const dataset = getDemoTleDataset('25544');
    const baseStart = Date.parse('2026-11-24T12:00:00Z');

    const bengaluruPasses = predictPasses(
      dataset,
      {
        name: 'Bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
        elevationM: 920,
        timezone: 'Asia/Kolkata',
      },
      { minElevationDeg: 10, lookaheadDays: 7, darknessThresholdDeg: -6 },
      baseStart,
    );

    const londonPasses = predictPasses(
      dataset,
      {
        name: 'London',
        latitude: 51.5072,
        longitude: -0.1276,
        elevationM: 11,
        timezone: 'Europe/London',
      },
      { minElevationDeg: 10, lookaheadDays: 7, darknessThresholdDeg: -6 },
      baseStart,
    );

    const shiftedWindowPasses = predictPasses(
      dataset,
      {
        name: 'Bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
        elevationM: 920,
        timezone: 'Asia/Kolkata',
      },
      { minElevationDeg: 10, lookaheadDays: 7, darknessThresholdDeg: -6 },
      baseStart + 7 * 86_400_000,
    );

    const extendedRangePasses = predictPasses(
      dataset,
      {
        name: 'Bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
        elevationM: 920,
        timezone: 'Asia/Kolkata',
      },
      { minElevationDeg: 10, lookaheadDays: 14, darknessThresholdDeg: -6 },
      baseStart,
    );

    expect(bengaluruPasses.passes.length).toBeGreaterThan(0);
    expect(londonPasses.passes.length).toBeGreaterThan(0);
    expect(shiftedWindowPasses.passes.length).toBeGreaterThan(0);
    expect(extendedRangePasses.passes.length).toBeGreaterThan(bengaluruPasses.passes.length);

    // Location change produces different calculated pass times
    expect(bengaluruPasses.passes[0].startTimeMs).not.toBe(londonPasses.passes[0].startTimeMs);
    // Date range change produces different calculated upcoming pass times
    expect(shiftedWindowPasses.passes[0].startTimeMs).toBeGreaterThanOrEqual(
      baseStart + 7 * 86_400_000,
    );
    expect(shiftedWindowPasses.passes[0].startTimeMs).not.toBe(
      bengaluruPasses.passes[0].startTimeMs,
    );
  });

  it('flags stale orbit data and rejects invalid orbital elements with explicit errors', () => {
    const nowMs = Date.parse('2026-12-05T12:00:00Z');
    const staleStatus = getOrbitDataStaleStatus(
      {
        ...getDemoTleDataset('25544'),
        isDemo: false,
        fetchedAt: '2026-12-05T11:30:00.000Z',
        epochAt: '2026-11-24T12:20:30.000Z',
      },
      nowMs,
    );
    expect(staleStatus.stale).toBe(true);

    expect(() =>
      parseOmmJsonPayload(
        [
          {
            OBJECT_NAME: 'BAD SAT',
            OBJECT_ID: '2026-000A',
            EPOCH: '2026-11-25T12:00:00',
            MEAN_MOTION: -1,
            ECCENTRICITY: 1.5,
            INCLINATION: 51.6,
            RA_OF_ASC_NODE: 10,
            ARG_OF_PERICENTER: 10,
            MEAN_ANOMALY: 10,
            NORAD_CAT_ID: 99999,
            ELEMENT_SET_NO: 1,
            BSTAR: 0,
            MEAN_MOTION_DOT: 0,
            MEAN_MOTION_DDOT: 0,
          },
        ],
        '99999',
        'https://celestrak.org/test',
      ),
    ).toThrow();
  });
});
