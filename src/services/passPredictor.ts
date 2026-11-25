import * as satellite from 'satellite.js';
import {
  CurrentPositionEstimate,
  ObserverLocation,
  OrbitDataset,
  PassPoint,
  PassQuality,
  PredictionResult,
  SatellitePass,
  SkyCondition,
  ViewingPreferences,
} from '../types/orbit';

const EARTH_RADIUS_KM = 6378.137;
const AU_IN_KM = 149_597_870.7;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const COARSE_STEP_MS = 20_000; // 20 seconds ensures no LEO pass is missed

export function azimuthToCompass(azimuthDeg: number): string {
  const dirs = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return dirs[index];
}

export function createSatRec(dataset: OrbitDataset): satellite.SatRec {
  let satrec: satellite.SatRec;
  if (dataset.omm) {
    satrec = satellite.json2satrec(dataset.omm);
  } else if (dataset.line1 && dataset.line2) {
    satrec = satellite.twoline2satrec(dataset.line1, dataset.line2);
  } else {
    throw new Error('Orbit dataset contains neither OMM JSON nor TLE orbital elements.');
  }

  if (satrec.error !== satellite.SatRecError.None) {
    throw new Error(
      `SGP4 initialization failed for ${dataset.satelliteName} (error code ${satrec.error}).`,
    );
  }
  return satrec;
}

/**
 * Computes the Sun's ECI position vector in km using satellite.js sunPos (with AU -> km conversion).
 */
export function getSunEciKm(date: Date): { x: number; y: number; z: number } {
  const jd = satellite.jday(date);
  const sunObj = satellite.sunPos(jd) as { rsun: number[] | { x: number; y: number; z: number } };
  const rsun = sunObj.rsun;
  const x = Array.isArray(rsun) ? rsun[0] : rsun.x;
  const y = Array.isArray(rsun) ? rsun[1] : rsun.y;
  const z = Array.isArray(rsun) ? rsun[2] : rsun.z;
  return {
    x: x * AU_IN_KM,
    y: y * AU_IN_KM,
    z: z * AU_IN_KM,
  };
}

/**
 * Checks whether the satellite is illuminated by the Sun using Earth shadow geometry.
 */
export function isSatelliteSunlit(
  satEciKm: { x: number; y: number; z: number },
  sunEciKm: { x: number; y: number; z: number },
): boolean {
  const sunMag = Math.hypot(sunEciKm.x, sunEciKm.y, sunEciKm.z);
  if (sunMag === 0) return false;
  const sunUnit = {
    x: sunEciKm.x / sunMag,
    y: sunEciKm.y / sunMag,
    z: sunEciKm.z / sunMag,
  };

  const dot = satEciKm.x * sunUnit.x + satEciKm.y * sunUnit.y + satEciKm.z * sunUnit.z;
  if (dot >= 0) {
    return true;
  }

  const satSq = satEciKm.x * satEciKm.x + satEciKm.y * satEciKm.y + satEciKm.z * satEciKm.z;
  const perpDistSq = Math.max(0, satSq - dot * dot);
  return Math.sqrt(perpDistSq) > EARTH_RADIUS_KM;
}

function samplePointAt(
  satrec: satellite.SatRec,
  observerGd: satellite.GeodeticLocation,
  timestampMs: number,
  minElevationDeg: number,
  darknessThresholdDeg: number,
): PassPoint | null {
  const date = new Date(timestampMs);
  const propagated = satellite.propagate(satrec, date);
  if (!propagated || satrec.error !== satellite.SatRecError.None) {
    return null;
  }

  const gmst = satellite.gstime(date);
  const satEci = propagated.position;
  const satEcf = satellite.eciToEcf(satEci, gmst);
  const lookAngles = satellite.ecfToLookAngles(observerGd, satEcf);

  const sunEciKm = getSunEciKm(date);
  const sunEcf = satellite.eciToEcf(sunEciKm, gmst);
  const sunLook = satellite.ecfToLookAngles(observerGd, sunEcf);

  const elevationDeg = lookAngles.elevation * RAD_TO_DEG;
  const azimuthDeg = ((lookAngles.azimuth * RAD_TO_DEG) % 360 + 360) % 360;
  const sunElevationDeg = sunLook.elevation * RAD_TO_DEG;
  const sunlit = isSatelliteSunlit(satEci, sunEciKm);
  const isVisible =
    elevationDeg >= minElevationDeg && sunElevationDeg <= darknessThresholdDeg && sunlit;

  return {
    timestampMs,
    azimuthDeg,
    elevationDeg,
    rangeKm: lookAngles.rangeSat,
    sunElevationDeg,
    isSunlit: sunlit,
    isVisible,
  };
}

function refineHorizonCrossing(
  satrec: satellite.SatRec,
  observerGd: satellite.GeodeticLocation,
  lowMs: number,
  highMs: number,
  rising: boolean,
  minElevationDeg: number,
  darknessThresholdDeg: number,
): number {
  let lo = lowMs;
  let hi = highMs;
  for (let i = 0; i < 14; i += 1) {
    const mid = Math.round((lo + hi) / 2);
    const pt = samplePointAt(satrec, observerGd, mid, minElevationDeg, darknessThresholdDeg);
    if (!pt) break;
    const above = pt.elevationDeg >= 0;
    if ((rising && above) || (!rising && !above)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return Math.round((lo + hi) / 2);
}

function classifySkyCondition(sunElevationDeg: number): SkyCondition {
  if (sunElevationDeg <= -18) return 'astronomical';
  if (sunElevationDeg <= -12) return 'nautical';
  return 'civil';
}

function classifyQuality(maxElevationDeg: number, sunElevationDeg: number): PassQuality {
  if (maxElevationDeg >= 45 && sunElevationDeg <= -9) return 'excellent';
  if (maxElevationDeg >= 25) return 'good';
  return 'fair';
}

export function estimateCurrentPosition(
  dataset: OrbitDataset,
  location: ObserverLocation,
  now = new Date(),
): CurrentPositionEstimate {
  const satrec = createSatRec(dataset);
  const propagated = satellite.propagate(satrec, now);
  if (!propagated || satrec.error !== satellite.SatRecError.None) {
    throw new Error(
      `Unable to propagate current ${dataset.satelliteName} position (SGP4 error code ${satrec.error}).`,
    );
  }

  const gmst = satellite.gstime(now);
  const satEci = propagated.position;
  const satVel = propagated.velocity;
  const geodetic = satellite.eciToGeodetic(satEci, gmst);

  const observerGd: satellite.GeodeticLocation = {
    longitude: location.longitude * DEG_TO_RAD,
    latitude: location.latitude * DEG_TO_RAD,
    height: location.elevationM / 1000,
  };
  const satEcf = satellite.eciToEcf(satEci, gmst);
  const lookAngles = satellite.ecfToLookAngles(observerGd, satEcf);

  const sunEciKm = getSunEciKm(now);
  const isSunlit = isSatelliteSunlit(satEci, sunEciKm);
  const elevationDeg = lookAngles.elevation * RAD_TO_DEG;

  return {
    timestampMs: now.getTime(),
    latitudeDeg: satellite.degreesLat(geodetic.latitude),
    longitudeDeg: satellite.degreesLong(geodetic.longitude),
    altitudeKm: geodetic.height,
    speedKmS: Math.hypot(satVel.x, satVel.y, satVel.z),
    azimuthDeg: ((lookAngles.azimuth * RAD_TO_DEG) % 360 + 360) % 360,
    elevationDeg,
    rangeKm: lookAngles.rangeSat,
    isSunlit,
    aboveHorizon: elevationDeg >= 0,
  };
}

export function predictPasses(
  dataset: OrbitDataset,
  location: ObserverLocation,
  preferences: ViewingPreferences,
  startTimeMs = Date.now(),
): PredictionResult {
  const satrec = createSatRec(dataset);
  const observerGd: satellite.GeodeticLocation = {
    longitude: location.longitude * DEG_TO_RAD,
    latitude: location.latitude * DEG_TO_RAD,
    height: location.elevationM / 1000,
  };

  const endTimeMs = startTimeMs + preferences.lookaheadDays * 86_400_000;
  const passes: SatellitePass[] = [];
  const stats = {
    totalAboveHorizon: 0,
    tooLow: 0,
    daylight: 0,
    inShadow: 0,
  };

  let prevPoint: PassPoint | null = null;
  let inPass = false;
  let approxRiseMs = startTimeMs;
  let validSamples = 0;
  let failedSamples = 0;

  for (let t = startTimeMs; t <= endTimeMs; t += COARSE_STEP_MS) {
    const pt = samplePointAt(
      satrec,
      observerGd,
      t,
      preferences.minElevationDeg,
      preferences.darknessThresholdDeg,
    );
    if (!pt) {
      failedSamples += 1;
      continue;
    }
    validSamples += 1;

    if (!inPass && pt.elevationDeg >= 0) {
      inPass = true;
      approxRiseMs = prevPoint
        ? refineHorizonCrossing(
            satrec,
            observerGd,
            prevPoint.timestampMs,
            t,
            true,
            preferences.minElevationDeg,
            preferences.darknessThresholdDeg,
          )
        : t;
    } else if (inPass && pt.elevationDeg < 0) {
      inPass = false;
      const horizonSetMs = prevPoint
        ? refineHorizonCrossing(
            satrec,
            observerGd,
            prevPoint.timestampMs,
            t,
            false,
            preferences.minElevationDeg,
            preferences.darknessThresholdDeg,
          )
        : t;

      const evaluated = buildPassRecord(
        satrec,
        observerGd,
        dataset,
        approxRiseMs,
        horizonSetMs,
        preferences.minElevationDeg,
        preferences.darknessThresholdDeg,
        stats,
      );
      if (evaluated) {
        passes.push(evaluated);
      }
    }

    prevPoint = pt;
  }

  if (validSamples === 0 && failedSamples > 0) {
    throw new Error(
      `Orbital propagation failed for ${dataset.satelliteName} (SGP4 error code ${satrec.error}). Refresh orbital data from CelesTrak.`,
    );
  }

  return {
    passes,
    stats,
    generatedAt: new Date().toISOString(),
    searchStartMs: startTimeMs,
    lookaheadDays: preferences.lookaheadDays,
  };
}

function buildPassRecord(
  satrec: satellite.SatRec,
  observerGd: satellite.GeodeticLocation,
  dataset: OrbitDataset,
  horizonRiseTimeMs: number,
  horizonSetTimeMs: number,
  minElevationDeg: number,
  darknessThresholdDeg: number,
  stats: PredictionResult['stats'],
): SatellitePass | null {
  stats.totalAboveHorizon += 1;

  const durationTotalMs = Math.max(1000, horizonSetTimeMs - horizonRiseTimeMs);
  const sampleStepMs = Math.max(3000, Math.min(8000, Math.floor(durationTotalMs / 45)));
  const trajectory: PassPoint[] = [];

  for (let t = horizonRiseTimeMs; t <= horizonSetTimeMs; t += sampleStepMs) {
    const pt = samplePointAt(satrec, observerGd, t, minElevationDeg, darknessThresholdDeg);
    if (pt) trajectory.push(pt);
  }
  const endPt = samplePointAt(
    satrec,
    observerGd,
    horizonSetTimeMs,
    minElevationDeg,
    darknessThresholdDeg,
  );
  if (endPt && (trajectory.length === 0 || trajectory[trajectory.length - 1].timestampMs < horizonSetTimeMs)) {
    trajectory.push(endPt);
  }

  if (trajectory.length === 0) return null;

  const overallPeak = trajectory.reduce((best, cur) =>
    cur.elevationDeg > best.elevationDeg ? cur : best,
  );

  const visiblePoints = trajectory.filter((p) => p.isVisible);
  if (visiblePoints.length === 0) {
    if (overallPeak.elevationDeg < minElevationDeg) {
      stats.tooLow += 1;
    } else if (overallPeak.sunElevationDeg > darknessThresholdDeg) {
      stats.daylight += 1;
    } else {
      stats.inShadow += 1;
    }
    return null;
  }

  const visibleStart = visiblePoints[0];
  const visibleEnd = visiblePoints[visiblePoints.length - 1];
  const visiblePeak = visiblePoints.reduce((best, cur) =>
    cur.elevationDeg > best.elevationDeg ? cur : best,
  );

  // Refine visible peak to 1-second resolution
  let refinedPeak = visiblePeak;
  for (
    let t = Math.max(visibleStart.timestampMs, visiblePeak.timestampMs - sampleStepMs);
    t <= Math.min(visibleEnd.timestampMs, visiblePeak.timestampMs + sampleStepMs);
    t += 1000
  ) {
    const pt = samplePointAt(satrec, observerGd, t, minElevationDeg, darknessThresholdDeg);
    if (pt && pt.isVisible && pt.elevationDeg > refinedPeak.elevationDeg) {
      refinedPeak = pt;
    }
  }

  const sunlitCount = trajectory.filter((p) => p.isSunlit).length;

  return {
    id: `${dataset.noradId}-${visibleStart.timestampMs}`,
    noradId: dataset.noradId,
    satelliteName: dataset.satelliteName,
    startTimeMs: visibleStart.timestampMs,
    peakTimeMs: refinedPeak.timestampMs,
    endTimeMs: visibleEnd.timestampMs,
    horizonRiseTimeMs,
    horizonSetTimeMs,
    startAzimuthDeg: Math.round(visibleStart.azimuthDeg),
    peakAzimuthDeg: Math.round(refinedPeak.azimuthDeg),
    endAzimuthDeg: Math.round(visibleEnd.azimuthDeg),
    startElevationDeg: Number(visibleStart.elevationDeg.toFixed(1)),
    maxElevationDeg: Number(refinedPeak.elevationDeg.toFixed(1)),
    endElevationDeg: Number(visibleEnd.elevationDeg.toFixed(1)),
    durationSec: Math.max(1, Math.round((visibleEnd.timestampMs - visibleStart.timestampMs) / 1000)),
    sunElevationAtPeakDeg: Number(refinedPeak.sunElevationDeg.toFixed(1)),
    skyCondition: classifySkyCondition(refinedPeak.sunElevationDeg),
    quality: classifyQuality(refinedPeak.elevationDeg, refinedPeak.sunElevationDeg),
    sunlitFraction: Number((sunlitCount / trajectory.length).toFixed(2)),
    trajectory,
  };
}

export function formatPassTime(timestampMs: number, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(timestampMs));
}

export function formatPassShortTime(timestampMs: number, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(timestampMs));
}

export function formatPassDate(timestampMs: number, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestampMs));
}

export function formatDateTimeInZone(timestampMs: number, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(timestampMs));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (mins === 0) return `${rem}s`;
  return rem === 0 ? `${mins}m` : `${mins}m ${rem}s`;
}
