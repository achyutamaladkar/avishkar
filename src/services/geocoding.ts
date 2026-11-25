import { CITY_PRESETS } from '../data/cities';
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
  source: 'live' | 'local-fallback';
}

export function searchLocalCities(query: string): CityPreset[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return CITY_PRESETS.slice(0, 6);
  }
  return CITY_PRESETS.filter(
    (city) =>
      city.name.toLowerCase().includes(normalized) ||
      city.country.toLowerCase().includes(normalized) ||
      city.region.toLowerCase().includes(normalized),
  ).slice(0, 8);
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<CitySearchResult> {
  const trimmed = query.trim();
  const localMatches = searchLocalCities(trimmed);
  if (trimmed.length < 2) {
    return { matches: localMatches, source: 'local-fallback' };
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed,
    )}&count=6&language=en&format=json`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return { matches: localMatches, source: 'local-fallback' };
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

    if (apiMatches.length > 0) {
      return { matches: apiMatches, source: 'live' };
    }
    return { matches: localMatches, source: 'local-fallback' };
  } catch {
    return { matches: localMatches, source: 'local-fallback' };
  }
}
