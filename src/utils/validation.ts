export interface ValidationErrors {
  latitude?: string;
  longitude?: string;
  elevationM?: string;
  minElevationDeg?: string;
  timezone?: string;
}

export function isValidTimezone(tz: string): boolean {
  if (!tz.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

export function validateViewingInputs(inputs: {
  latitude: string;
  longitude: string;
  elevationM: string;
  minElevationDeg: number;
  timezone: string;
}): { valid: boolean; errors: ValidationErrors; parsed?: { latitude: number; longitude: number; elevationM: number } } {
  const errors: ValidationErrors = {};

  const lat = Number(inputs.latitude);
  if (inputs.latitude.trim() === '' || Number.isNaN(lat) || !Number.isFinite(lat)) {
    errors.latitude = 'Enter a numeric latitude between -90 and 90.';
  } else if (lat < -90 || lat > 90) {
    errors.latitude = 'Latitude must be between -90° and +90°.';
  }

  const lon = Number(inputs.longitude);
  if (inputs.longitude.trim() === '' || Number.isNaN(lon) || !Number.isFinite(lon)) {
    errors.longitude = 'Enter a numeric longitude between -180 and 180.';
  } else if (lon < -180 || lon > 180) {
    errors.longitude = 'Longitude must be between -180° and +180°.';
  }

  const elev = Number(inputs.elevationM);
  if (inputs.elevationM.trim() === '' || Number.isNaN(elev) || !Number.isFinite(elev)) {
    errors.elevationM = 'Enter observer elevation in meters (0 if unknown).';
  } else if (elev < -500 || elev > 9000) {
    errors.elevationM = 'Elevation must be between -500 m and 9,000 m.';
  }

  if (Number.isNaN(inputs.minElevationDeg) || inputs.minElevationDeg < 5 || inputs.minElevationDeg > 80) {
    errors.minElevationDeg = 'Minimum elevation must be between 5° and 80°.';
  }

  if (!isValidTimezone(inputs.timezone)) {
    errors.timezone = 'Select or enter a valid IANA time zone (e.g., Asia/Kolkata or America/New_York).';
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    parsed: valid
      ? {
          latitude: Number(lat.toFixed(4)),
          longitude: Number(lon.toFixed(4)),
          elevationM: Math.round(elev),
        }
      : undefined,
  };
}

/**
 * Parses pasted coordinate strings like "12.9716, 77.5946" or "37.7749 -122.4194".
 */
export function parseCoordinatePair(raw: string): { latitude: number; longitude: number } | null {
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}
