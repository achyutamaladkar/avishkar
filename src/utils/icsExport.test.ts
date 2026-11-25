import { describe, expect, it } from 'vitest';
import { buildPassIcsContent, buildPassIcsFilename } from './icsExport';
import { SatellitePass } from '../types/orbit';

const SAMPLE_PASS: SatellitePass = {
  id: '25544-1795524600000',
  noradId: '25544',
  satelliteName: 'ISS (ZARYA)',
  startTimeMs: Date.parse('2026-11-25T13:30:00Z'),
  peakTimeMs: Date.parse('2026-11-25T13:33:00Z'),
  endTimeMs: Date.parse('2026-11-25T13:36:00Z'),
  horizonRiseTimeMs: Date.parse('2026-11-25T13:28:00Z'),
  horizonSetTimeMs: Date.parse('2026-11-25T13:38:00Z'),
  startAzimuthDeg: 310,
  peakAzimuthDeg: 35,
  endAzimuthDeg: 115,
  startElevationDeg: 10.2,
  maxElevationDeg: 58.4,
  endElevationDeg: 10.1,
  durationSec: 360,
  sunElevationAtPeakDeg: -14.5,
  skyCondition: 'nautical',
  quality: 'excellent',
  sunlitFraction: 1,
  trajectory: [],
};

describe('icsExport', () => {
  it('generates valid RFC 5545 calendar content with VALARM', () => {
    const ics = buildPassIcsContent({
      pass: SAMPLE_PASS,
      location: {
        name: 'Bengaluru, India',
        latitude: 12.9716,
        longitude: 77.5946,
        elevationM: 920,
        timezone: 'Asia/Kolkata',
      },
      reminderMinutes: 15,
      isDemo: false,
      nowMs: Date.parse('2026-11-25T12:00:00Z'),
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261125T133000Z');
    expect(ics).toContain('DTEND:20261125T133600Z');
    expect(ics).toContain('TRIGGER:-PT15M');
    expect(ics).toContain('END:VALARM');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('Bengaluru\\, India');
  });

  it('creates a clean UTC-stamped filename', () => {
    expect(buildPassIcsFilename(SAMPLE_PASS)).toBe('orbitview-iss-zarya-20261125-1330Z.ics');
  });
});
