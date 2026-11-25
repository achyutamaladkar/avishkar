import { TleDataset } from '../types/orbit';

const CACHE_KEY_PREFIX = 'orbitview.tle.v1.';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours: polite caching for CelesTrak GP queries

export const DEMO_TLE_BY_NORAD: Record<string, Omit<TleDataset, 'fetchedAt' | 'fromCache'>> = {
  '25544': {
    noradId: '25544',
    satelliteName: 'ISS (ZARYA)',
    line1: '1 25544U 98067A   26328.51423611  .00014250  00000+0  25840-3 0  9995',
    line2: '2 25544  51.6388 214.4820 0006214 112.4510  48.2910 15.49814210482159',
    sourceName: 'Demo Sample TLE (Archived ISS Orbital Elements)',
    sourceUrl: 'local://demo-sample-tle',
    epochAt: '2026-11-24T12:20:30.000Z',
    isDemo: true,
  },
  '48274': {
    noradId: '48274',
    satelliteName: 'CSS (TIANHE)',
    line1: '1 48274U 21035A   26328.48101852  .00018120  00000+0  21240-3 0  9991',
    line2: '2 48274  41.4742  92.1180 0004920  74.1200 285.9910 15.60521490319824',
    sourceName: 'Demo Sample TLE (Archived Tiangong Orbital Elements)',
    sourceUrl: 'local://demo-sample-tle',
    epochAt: '2026-11-24T11:32:40.000Z',
    isDemo: true,
  },
  '20580': {
    noradId: '20580',
    satelliteName: 'HST',
    line1: '1 20580U 90037B   26328.42013889  .00003140  00000+0  13920-3 0  9998',
    line2: '2 20580  28.4691 164.2210 0002480 218.5400 141.5200 15.16102910975421',
    sourceName: 'Demo Sample TLE (Archived Hubble Orbital Elements)',
    sourceUrl: 'local://demo-sample-tle',
    epochAt: '2026-11-24T10:05:00.000Z',
    isDemo: true,
  },
};

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
): Omit<TleDataset, 'fetchedAt' | 'fromCache' | 'isDemo'> {
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
    line1,
    line2,
    sourceName: `CelesTrak GP (NORAD ${noradId})`,
    sourceUrl,
    epochAt: parseTleEpoch(line1),
  };
}

export function readCachedTle(noradId: string): TleDataset | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${noradId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TleDataset;
    if (!parsed.line1 || !parsed.line2 || !parsed.fetchedAt) return null;
    return { ...parsed, fromCache: true };
  } catch {
    return null;
  }
}

function writeCachedTle(dataset: TleDataset): void {
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${dataset.noradId}`, JSON.stringify(dataset));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function isCacheFresh(dataset: TleDataset, nowMs = Date.now()): boolean {
  const fetchedMs = Date.parse(dataset.fetchedAt);
  if (Number.isNaN(fetchedMs)) return false;
  return nowMs - fetchedMs < CACHE_TTL_MS;
}

export function getDemoTleDataset(noradId: string): TleDataset {
  const template = DEMO_TLE_BY_NORAD[noradId] ?? DEMO_TLE_BY_NORAD['25544'];
  return {
    ...template,
    fetchedAt: new Date().toISOString(),
    fromCache: false,
  };
}

export interface TleFetchError extends Error {
  cachedFallback?: TleDataset;
}

export async function fetchLiveTle(
  noradId: string,
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<TleDataset> {
  const cached = readCachedTle(noradId);
  if (!options.forceRefresh && cached && isCacheFresh(cached)) {
    return cached;
  }

  const sourceUrl = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${encodeURIComponent(
    noradId,
  )}&FORMAT=TLE`;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 9000);
  const combinedSignal = options.signal ?? timeoutController.signal;

  try {
    const response = await fetch(sourceUrl, { signal: combinedSignal });
    if (!response.ok) {
      throw new Error(`CelesTrak responded with HTTP ${response.status}`);
    }
    const text = await response.text();
    const parsed = parseTleText(text, noradId, sourceUrl);
    const liveDataset: TleDataset = {
      ...parsed,
      fetchedAt: new Date().toISOString(),
      isDemo: false,
      fromCache: false,
    };
    writeCachedTle(liveDataset);
    return liveDataset;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Timed out while fetching live TLE data from CelesTrak.'
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
