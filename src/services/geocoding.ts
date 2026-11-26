import { CityPreset } from '../types/orbit';

interface OpenMeteoGeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
}

export interface CitySearchResult {
  matches: CityPreset[];
  status: 'idle' | 'loading' | 'success' | 'no-results' | 'error';
  errorMessage?: string;
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<CitySearchResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { matches: [], status: 'idle' };
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed,
    )}&count=8&language=en&format=json`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return {
        matches: [],
        status: 'error',
        errorMessage: `Open-Meteo Geocoding service responded with HTTP ${response.status}.`,
      };
    }
    const payload = (await response.json()) as OpenMeteoGeocodingResponse;
    const apiMatches: CityPreset[] = (payload.results ?? [])
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .map((item) => ({
        id: `om-${item.id}`,
        name: item.name,
        region: item.admin1 ?? '',
        country: item.country ?? '',
        latitude: Number(item.latitude.toFixed(4)),
        longitude: Number(item.longitude.toFixed(4)),
        elevationM: Math.round(item.elevation ?? 0),
        timezone: item.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      }));

    if (apiMatches.length === 0) {
      return { matches: [], status: 'no-results' };
    }

    return { matches: apiMatches, status: 'success' };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { matches: [], status: 'idle' };
    }
    return {
      matches: [],
      status: 'error',
      errorMessage: 'Could not connect to Open-Meteo Geocoding API. Check network connection or enter coordinates manually.',
    };
  }
}
