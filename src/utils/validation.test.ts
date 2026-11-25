import { describe, expect, it } from 'vitest';
import { parseCoordinatePair, validateViewingInputs } from './validation';

describe('validateViewingInputs', () => {
  it('accepts valid Bengaluru coordinates and viewing preferences', () => {
    const result = validateViewingInputs({
      latitude: '12.9716',
      longitude: '77.5946',
      elevationM: '920',
      minElevationDeg: 15,
      timezone: 'Asia/Kolkata',
    });

    expect(result.valid).toBe(true);
    expect(result.parsed).toEqual({
      latitude: 12.9716,
      longitude: 77.5946,
      elevationM: 920,
    });
  });

  it('rejects out-of-range latitude, longitude, and invalid timezone', () => {
    const result = validateViewingInputs({
      latitude: '95',
      longitude: '-185',
      elevationM: '10',
      minElevationDeg: 10,
      timezone: 'Mars/Olympus',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.latitude).toBeDefined();
    expect(result.errors.longitude).toBeDefined();
    expect(result.errors.timezone).toBeDefined();
  });

  it('parses pasted coordinate pairs cleanly', () => {
    expect(parseCoordinatePair('37.7749, -122.4194')).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
    });
    expect(parseCoordinatePair('91.0, 0')).toBeNull();
  });
});
