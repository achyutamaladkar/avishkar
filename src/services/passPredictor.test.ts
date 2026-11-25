import { describe, expect, it } from 'vitest';
import { azimuthToCompass, getSunEciKm, isSatelliteSunlit, predictPasses } from './passPredictor';
import { getDemoTleDataset, parseTleEpoch, parseTleText } from './tleService';

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
  });

  it('detects Earth shadow vs sunlit satellite positions', () => {
    const sun = getSunEciKm(new Date('2026-11-24T12:00:00Z'));
    const sunMag = Math.hypot(sun.x, sun.y, sun.z);
    const unit = { x: sun.x / sunMag, y: sun.y / sunMag, z: sun.z / sunMag };

    // Dayside satellite is always sunlit
    expect(isSatelliteSunlit({ x: unit.x * 6800, y: unit.y * 6800, z: unit.z * 6800 }, sun)).toBe(
      true,
    );
    // Directly behind Earth inside umbra is in shadow
    expect(
      isSatelliteSunlit({ x: -unit.x * 6800, y: -unit.y * 6800, z: -unit.z * 6800 }, sun),
    ).toBe(false);
  });

  it('finds likely-visible ISS passes and filters out daylight/shadowed passes', () => {
    const tle = getDemoTleDataset('25544');
    const result = predictPasses(
      tle,
      {
        name: 'Bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
        elevationM: 920,
        timezone: 'Asia/Kolkata',
      },
      {
        minElevationDeg: 10,
        lookaheadDays: 7,
        darknessThresholdDeg: -6,
      },
      Date.parse('2026-11-24T12:00:00Z'),
    );

    expect(result.stats.totalAboveHorizon).toBeGreaterThan(10);
    expect(result.passes.length).toBeGreaterThan(0);
    for (const pass of result.passes) {
      expect(pass.maxElevationDeg).toBeGreaterThanOrEqual(10);
      expect(pass.sunElevationAtPeakDeg).toBeLessThanOrEqual(-6);
      expect(pass.startTimeMs).toBeLessThanOrEqual(pass.peakTimeMs);
      expect(pass.peakTimeMs).toBeLessThanOrEqual(pass.endTimeMs);
      expect(pass.trajectory.some((pt) => pt.isVisible)).toBe(true);
    }
  });
});
