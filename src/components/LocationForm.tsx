import React, { useEffect, useRef, useState } from 'react';
import { Compass, LocateFixed, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { CITY_PRESETS, COMMON_TIMEZONES, SATELLITE_OPTIONS } from '../data/cities';
import { searchCities, searchLocalCities } from '../services/geocoding';
import { CityPreset, ObserverLocation, ViewingPreferences } from '../types/orbit';
import { ValidationErrors, parseCoordinatePair, validateViewingInputs } from '../utils/validation';

interface LocationFormProps {
  location: ObserverLocation;
  preferences: ViewingPreferences;
  satelliteId: string;
  isLoading: boolean;
  onSubmit: (next: {
    location: ObserverLocation;
    preferences: ViewingPreferences;
    satelliteId: string;
  }) => void;
}

export const LocationForm: React.FC<LocationFormProps> = ({
  location,
  preferences,
  satelliteId,
  isLoading,
  onSubmit,
}) => {
  const [cityQuery, setCityQuery] = useState(location.name);
  const [suggestions, setSuggestions] = useState<CityPreset[]>(() => searchLocalCities(''));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocodeSource, setGeocodeSource] = useState<'live' | 'local-fallback'>('local-fallback');
  const [isSearchingCities, setIsSearchingCities] = useState(false);

  const [latitude, setLatitude] = useState(String(location.latitude));
  const [longitude, setLongitude] = useState(String(location.longitude));
  const [elevationM, setElevationM] = useState(String(location.elevationM));
  const [timezone, setTimezone] = useState(location.timezone);
  const [minElevationDeg, setMinElevationDeg] = useState(preferences.minElevationDeg);
  const [lookaheadDays, setLookaheadDays] = useState(preferences.lookaheadDays);
  const [selectedSatId, setSelectedSatId] = useState(satelliteId);
  const [locationLabel, setLocationLabel] = useState(location.name);

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showSuggestions) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearchingCities(true);
      const result = await searchCities(cityQuery, controller.signal);
      setSuggestions(result.matches);
      setGeocodeSource(result.source);
      setIsSearchingCities(false);
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [cityQuery, showSuggestions]);

  const applyPreset = (city: CityPreset) => {
    const label = city.region ? `${city.name}, ${city.country}` : `${city.name}${city.country ? `, ${city.country}` : ''}`;
    setCityQuery(label);
    setLocationLabel(label);
    setLatitude(String(city.latitude));
    setLongitude(String(city.longitude));
    setElevationM(String(city.elevationM));
    setTimezone(city.timezone);
    setErrors({});
    setGeoMessage(null);
    setShowSuggestions(false);
  };

  const handleUseBrowserLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoMessage('Browser geolocation is unavailable on this device. Enter coordinates or pick a city instead.');
      return;
    }
    setIsLocating(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lon = Number(position.coords.longitude.toFixed(4));
        const alt = position.coords.altitude !== null ? Math.round(position.coords.altitude) : 0;
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
        setLatitude(String(lat));
        setLongitude(String(lon));
        setElevationM(String(alt));
        setTimezone(browserTz);
        setLocationLabel(`My Location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`);
        setCityQuery(`My Location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`);
        setErrors({});
        setGeoMessage('Device coordinates loaded. Click "Find passes" to compute visible passes.');
        setIsLocating(false);
      },
      (err) => {
        setGeoMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was declined. You can search by city or enter coordinates manually.'
            : 'Unable to determine browser location right now. Enter a city or coordinates manually.',
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };

  const handleCityInputChange = (value: string) => {
    setCityQuery(value);
    setShowSuggestions(true);
    const pair = parseCoordinatePair(value);
    if (pair) {
      setLatitude(String(pair.latitude));
      setLongitude(String(pair.longitude));
      setLocationLabel(`Custom (${pair.latitude.toFixed(2)}°, ${pair.longitude.toFixed(2)}°)`);
    } else if (value.trim()) {
      setLocationLabel(value.trim());
    }
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = validateViewingInputs({
      latitude,
      longitude,
      elevationM,
      minElevationDeg,
      timezone,
    });

    if (!result.valid || !result.parsed) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    onSubmit({
      location: {
        name: locationLabel || `${result.parsed.latitude}°, ${result.parsed.longitude}°`,
        latitude: result.parsed.latitude,
        longitude: result.parsed.longitude,
        elevationM: result.parsed.elevationM,
        timezone: timezone.trim(),
      },
      preferences: {
        minElevationDeg,
        lookaheadDays,
        darknessThresholdDeg: -6,
      },
      satelliteId: selectedSatId,
    });
  };

  const timezoneOptions = COMMON_TIMEZONES.includes(timezone)
    ? COMMON_TIMEZONES
    : [timezone, ...COMMON_TIMEZONES];

  return (
    <form className="panel form-panel" onSubmit={handleFormSubmit} noValidate>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Step 1 · Observer Setup</p>
          <h2>Where are you watching from?</h2>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-compact"
          onClick={handleUseBrowserLocation}
          disabled={isLocating}
        >
          <LocateFixed size={16} aria-hidden="true" />
          <span>{isLocating ? 'Locating…' : 'Use my location'}</span>
        </button>
      </div>

      {geoMessage && (
        <p className="inline-hint" role="status">
          {geoMessage}
        </p>
      )}

      <div className="form-grid">
        <div className="field field-full" ref={containerRef}>
          <label htmlFor="city-search">City search or paste "lat, lon"</label>
          <div className="input-with-icon">
            <Search size={16} className="input-icon" aria-hidden="true" />
            <input
              id="city-search"
              type="text"
              value={cityQuery}
              placeholder="Search e.g. Bengaluru, London, Tokyo or paste 12.97, 77.59"
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => handleCityInputChange(e.target.value)}
              autoComplete="off"
            />
          </div>
          {showSuggestions && (
            <div className="suggestions-menu" role="listbox" aria-label="City suggestions">
              <div className="suggestions-meta">
                <span>
                  {isSearchingCities
                    ? 'Searching cities…'
                    : geocodeSource === 'live'
                      ? 'Live geocoding results'
                      : 'Quick city index (works offline)'}
                </span>
              </div>
              {suggestions.length === 0 ? (
                <div className="suggestion-empty">
                  No city match — enter latitude and longitude below.
                </div>
              ) : (
                suggestions.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    className="suggestion-item"
                    onClick={() => applyPreset(city)}
                  >
                    <span className="suggestion-main">
                      <MapPin size={14} aria-hidden="true" />
                      <strong>{city.name}</strong>
                      {city.region ? `, ${city.region}` : ''}
                      {city.country ? ` · ${city.country}` : ''}
                    </span>
                    <span className="suggestion-coords">
                      {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="quick-cities" aria-label="Popular viewing cities">
          {CITY_PRESETS.slice(0, 5).map((city) => (
            <button
              key={city.id}
              type="button"
              className="chip-btn"
              onClick={() => applyPreset(city)}
            >
              {city.name}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="latitude-input">Latitude (°)</label>
          <input
            id="latitude-input"
            type="number"
            step="0.0001"
            min="-90"
            max="90"
            value={latitude}
            onChange={(e) => {
              setLatitude(e.target.value);
              setLocationLabel(`Custom (${e.target.value || '?'}°, ${longitude || '?'}°)`);
            }}
            aria-invalid={Boolean(errors.latitude)}
          />
          {errors.latitude && <span className="field-error">{errors.latitude}</span>}
        </div>

        <div className="field">
          <label htmlFor="longitude-input">Longitude (°)</label>
          <input
            id="longitude-input"
            type="number"
            step="0.0001"
            min="-180"
            max="180"
            value={longitude}
            onChange={(e) => {
              setLongitude(e.target.value);
              setLocationLabel(`Custom (${latitude || '?'}°, ${e.target.value || '?'}°)`);
            }}
            aria-invalid={Boolean(errors.longitude)}
          />
          {errors.longitude && <span className="field-error">{errors.longitude}</span>}
        </div>

        <div className="field">
          <label htmlFor="timezone-select">Display time zone</label>
          <select
            id="timezone-select"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            aria-invalid={Boolean(errors.timezone)}
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          {errors.timezone && <span className="field-error">{errors.timezone}</span>}
        </div>

        <div className="field">
          <label htmlFor="elevation-input">Observer elevation (m)</label>
          <input
            id="elevation-input"
            type="number"
            step="10"
            min="-500"
            max="9000"
            value={elevationM}
            onChange={(e) => setElevationM(e.target.value)}
            aria-invalid={Boolean(errors.elevationM)}
          />
          {errors.elevationM && <span className="field-error">{errors.elevationM}</span>}
        </div>

        <div className="field">
          <label htmlFor="satellite-select">Target spacecraft</label>
          <select
            id="satellite-select"
            value={selectedSatId}
            onChange={(e) => setSelectedSatId(e.target.value)}
          >
            {SATELLITE_OPTIONS.map((sat) => (
              <option key={sat.noradId} value={sat.noradId}>
                {sat.shortName} — {sat.name} (#{sat.noradId})
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="lookahead-select">Search window</label>
          <select
            id="lookahead-select"
            value={lookaheadDays}
            onChange={(e) => setLookaheadDays(Number(e.target.value))}
          >
            <option value={3}>Next 3 days</option>
            <option value={7}>Next 7 days</option>
            <option value={10}>Next 10 days</option>
          </select>
        </div>

        <div className="field field-full">
          <div className="slider-header">
            <label htmlFor="min-elevation-range">
              <SlidersHorizontal size={14} aria-hidden="true" />
              Minimum satellite elevation
            </label>
            <span className="slider-value">{minElevationDeg}° above horizon</span>
          </div>
          <input
            id="min-elevation-range"
            type="range"
            min={5}
            max={60}
            step={5}
            value={minElevationDeg}
            onChange={(e) => setMinElevationDeg(Number(e.target.value))}
          />
          <div className="slider-scale">
            <span>5° (open field)</span>
            <span>20° (clears trees/roofs)</span>
            <span>60° (overhead only)</span>
          </div>
          {errors.minElevationDeg && <span className="field-error">{errors.minElevationDeg}</span>}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
          <Compass size={18} aria-hidden="true" />
          <span>{isLoading ? 'Calculating passes…' : 'Find passes'}</span>
        </button>
        <p className="criteria-note">
          <Sparkles size={14} aria-hidden="true" />
          Filters for Sun ≥ 6° below your horizon, sunlit spacecraft, and peak ≥ {minElevationDeg}°.
        </p>
      </div>
    </form>
  );
};
