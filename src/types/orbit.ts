import type { OMMJsonObject } from 'satellite.js';

export type AppDataMode = 'live' | 'demo';

export interface SatelliteOption {
  noradId: string;
  name: string;
  shortName: string;
  description: string;
}

export interface ObserverLocation {
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  timezone: string;
}

export interface ViewingPreferences {
  minElevationDeg: number;
  lookaheadDays: number;
  darknessThresholdDeg: number;
}

export interface OrbitDataset {
  noradId: string;
  satelliteName: string;
  format: 'omm-json' | 'tle';
  omm?: OMMJsonObject;
  line1?: string;
  line2?: string;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  epochAt: string;
  isDemo: boolean;
  fromCache: boolean;
}

/** Backwards-compatible alias */
export type TleDataset = OrbitDataset;

export interface CurrentPositionEstimate {
  timestampMs: number;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
  speedKmS: number;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
  isSunlit: boolean;
  aboveHorizon: boolean;
}

export interface PassPoint {
  timestampMs: number;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
  sunElevationDeg: number;
  isSunlit: boolean;
  isVisible: boolean;
}

export type PassQuality = 'excellent' | 'good' | 'fair';
export type SkyCondition = 'astronomical' | 'nautical' | 'civil';

export interface SatellitePass {
  id: string;
  noradId: string;
  satelliteName: string;
  /** Start of the likely-visible segment (ms since epoch) */
  startTimeMs: number;
  /** Peak elevation timestamp within the visible segment (ms since epoch) */
  peakTimeMs: number;
  /** End of the likely-visible segment (ms since epoch) */
  endTimeMs: number;
  /** Horizon rise time (0 deg) */
  horizonRiseTimeMs: number;
  /** Horizon set time (0 deg) */
  horizonSetTimeMs: number;
  startAzimuthDeg: number;
  peakAzimuthDeg: number;
  endAzimuthDeg: number;
  startElevationDeg: number;
  maxElevationDeg: number;
  endElevationDeg: number;
  durationSec: number;
  sunElevationAtPeakDeg: number;
  skyCondition: SkyCondition;
  quality: PassQuality;
  sunlitFraction: number;
  trajectory: PassPoint[];
}

export interface FilteredPassStats {
  totalAboveHorizon: number;
  tooLow: number;
  daylight: number;
  inShadow: number;
}

export interface PredictionResult {
  passes: SatellitePass[];
  stats: FilteredPassStats;
  generatedAt: string;
  searchStartMs: number;
  lookaheadDays: number;
}

export interface CityPreset {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  timezone: string;
}
