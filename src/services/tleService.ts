import * as satellite from 'satellite.js';
import type { OMMJsonObject } from 'satellite.js';
import { OrbitDataset } from '../types/orbit';

const CACHE_KEY_PREFIX = 'orbitview.orbit.v3.';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours: polite caching for CelesTrak GP queries
const STALE_EPOCH_MS = 5 * 24 * 60 * 60 * 1000; // 5 days: SGP4 accuracy warning threshold

export function normalizeOmmEpochIso(epoch: string): string {
  const trimmed = epoch.trim();
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/i.test(trimmed);
  const parsed = Date.parse(hasZone ? trimmed : `${trimmed}Z`);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid OMM orbital element EPOCH "${epoch}".`);
  }
  return new Date(parsed).toISOString();
}

export function parseTleEpoch(line1: string): string {
  const yearTwoDigits = Number(line1.slice(18, 20));
  const dayOfYear = Number(line1.slice(20, 32));
  if (Number.isNaN(yearTwoDigits) || Number.isNaN(dayOfYear)) {
    return new Date().toISOString();
  }
  const fullYear = yearTwoDigits < 57 ? 2000 + yearTwoDigits : 1900 + yearTwoDigits;
  const jan1Ms = Date.UTC(fullYear, 0, 1, 0, 0, 0, 0);
  const epochMs = jan1Ms + (dayOfYear - 1) * 86_400_000;
  return new Date(epochMs).toISOString();
}

export function parseTleText(
  rawText: string,
  noradId: string,
  sourceUrl: string,
): Omit<OrbitDataset, 'fetchedAt' | 'fromCache'> {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let satelliteName = `NORAD ${noradId}`;
  let line1 = '';
  let line2 = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('1 ') && lines[i + 1]?.startsWith('2 ')) {
      line1 = line;
      line2 = lines[i + 1];
      if (i > 0 && !lines[i - 1].startsWith('1 ') && !lines[i - 1].startsWith('2 ')) {
        satelliteName = lines[i - 1];
      }
      break;
    }
  }

  if (!line1 || !line2 || line1.length < 60 || line2.length < 60) {
    throw new Error('CelesTrak returned an unexpected or incomplete TLE format.');
  }

  return {
    noradId,
    satelliteName,
    format: 'tle',
    line1,
    line2,
    sourceName: `CelesTrak GP TLE (NORAD ${noradId})`,
    sourceUrl,
    epochAt: parseTleEpoch(line1),
  };
}

export function parseOmmJsonPayload(
  payload: unknown,
  noradId: string,
  sourceUrl: string,
): Omit<OrbitDataset, 'fetchedAt' | 'fromCache'> {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error(`CelesTrak returned no OMM orbital data for NORAD ${noradId}.`);
  }

  const candidate =
    (payload.find((item) => String((item as Partial<OMMJsonObject>).NORAD_CAT_ID) === noradId) as
      | OMMJsonObject
      | undefined) ?? (payload[0] as OMMJsonObject);

  const requiredFields: Array<keyof OMMJsonObject> = [
    'OBJECT_NAME',
    'EPOCH',
    'MEAN_MOTION',
    'ECCENTRICITY',
    'INCLINATION',
    'RA_OF_ASC_NODE',
    'ARG_OF_PERICENTER',
    'MEAN_ANOMALY',
    'NORAD_CAT_ID',
  ];

  for (const field of requiredFields) {
    if (candidate[field] === undefined || candidate[field] === null || candidate[field] === '') {
      throw new Error(`CelesTrak OMM JSON is missing required field "${String(field)}".`);
    }
  }

  // Validate immediately with json2satrec from satellite.js
  const satrec = satellite.json2satrec(candidate);
  if (!satrec || satrec.error !== satellite.SatRecError.None) {
    throw new Error(
      `OMM orbital elements failed SGP4 initialization (error code ${satrec?.error ?? 'unknown'}).`,
    );
  }

  return {
    noradId: String(candidate.NORAD_CAT_ID),
    satelliteName: String(candidate.OBJECT_NAME).trim(),
    format: 'omm-json',
    omm: candidate,
    sourceName: `CelesTrak GP OMM JSON (NORAD ${candidate.NORAD_CAT_ID})`,
    sourceUrl,
    epochAt: normalizeOmmEpochIso(candidate.EPOCH),
  };
}

export function readCachedTle(noradId: string): OrbitDataset | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${noradId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrbitDataset;
    if (!parsed.fetchedAt || !parsed.epochAt || (!parsed.omm && (!parsed.line1 || !parsed.line2))) {
      return null;
    }
    return { ...parsed, fromCache: true };
  } catch {
    return null;
  }
}

function writeCachedTle(dataset: OrbitDataset): void {
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${dataset.noradId}`, JSON.stringify(dataset));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function isCacheFresh(dataset: OrbitDataset, nowMs = Date.now()): boolean {
  const fetchedMs = Date.parse(dataset.fetchedAt);
  if (Number.isNaN(fetchedMs)) return false;
  return nowMs - fetchedMs < CACHE_TTL_MS;
}

export function getOrbitDataStaleStatus(
  dataset: OrbitDataset,
  nowMs = Date.now(),
): { stale: boolean; reason?: string } {
  const epochMs = Date.parse(dataset.epochAt);
  const fetchedMs = Date.parse(dataset.fetchedAt);

  if (!Number.isNaN(epochMs) && nowMs - epochMs > STALE_EPOCH_MS) {
    const ageDays = Math.floor((nowMs - epochMs) / 86_400_000);
    return {
      stale: true,
      reason: `Orbital element epoch is ${ageDays} days old. Refresh to reduce SGP4 drift.`,
    };
  }

  if (!Number.isNaN(fetchedMs) && nowMs - fetchedMs >= CACHE_TTL_MS) {
    const ageHours = Math.max(2, Math.round((nowMs - fetchedMs) / 3_600_000));
    return {
      stale: true,
      reason: `Using cached CelesTrak data fetched ${ageHours}h ago because live refresh did not complete.`,
    };
  }

  return { stale: false };
}

export interface TleFetchError extends Error {
  cachedFallback?: OrbitDataset;
}

export async function fetchLiveTle(
  noradId: string,
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<OrbitDataset> {
  const cached = readCachedTle(noradId);
  if (!options.forceRefresh && cached && isCacheFresh(cached)) {
    return cached;
  }

  const sourceUrl = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${encodeURIComponent(
    noradId,
  )}&FORMAT=JSON`;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 9000);
  const combinedSignal = options.signal ?? timeoutController.signal;

  try {
    const response = await fetch(sourceUrl, {
      signal: combinedSignal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`CelesTrak responded with HTTP ${response.status}.`);
    }

    const rawText = await response.text();
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      if (rawText.toLowerCase().includes('no gp data')) {
        throw new Error(`CelesTrak has no GP orbit data for NORAD ${noradId}.`);
      }
      throw new Error('CelesTrak returned non-JSON data when OMM JSON was requested.');
    }

    const parsed = parseOmmJsonPayload(parsedJson, noradId, sourceUrl);
    const liveDataset: OrbitDataset = {
      ...parsed,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    };
    writeCachedTle(liveDataset);
    return liveDataset;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Timed out while fetching live OMM orbit data from CelesTrak.'
          : err.message
        : 'Unable to reach CelesTrak orbit data service.';
    const fetchErr = new Error(message) as TleFetchError;
    if (cached) {
      fetchErr.cachedFallback = cached;
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }
}
